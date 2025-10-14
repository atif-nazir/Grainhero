const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const admin = require("../middleware/admin");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const crypto = require("crypto");
require("dotenv").config();
const sendEmail = require("../utils/emailHelper");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

let streamUpload = (req) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
};

async function uploadFile(req) {
  let result = await streamUpload(req);
  return result;
}

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new use
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User Registered Successfully
 *       400:
 *         description: Bad request
 */
// Register Route
router.post("/signup", async (req, res) => {
  const { name, email, phone, password, confirm_password, invitation_token } =
    req.body;

  console.log("=== SIGNUP DEBUG ===");
  console.log("Request body:", {
    name,
    email,
    phone,
    invitation_token: invitation_token ? "PRESENT" : "NOT_PRESENT",
  });
  console.log("MongoDB connection state:", mongoose.connection.readyState); // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting

  try {
    if (!name || !email || !password || !confirm_password) {
      console.log("Validation failed: Missing required fields");
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    // Determine role based on signup context
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Role hierarchy: admin -> manager -> technician
    // First user = admin (tenant owner), invited users get assigned roles
    let userRole;
    if (isFirstUser) {
      userRole = "admin"; // First user becomes admin (tenant owner)
    } else {
      // Check if this is an invited user with a specific role
      const invitationToken = req.body.invitation_token;
      if (invitationToken) {
        // Handle invited user signup (will be implemented below)
        const invitation = await User.findOne({
          invitationToken: invitationToken,
          invitationExpires: { $gt: Date.now() },
        }).select("+invitationToken +invitationRole");

        if (invitation) {
          userRole = invitation.invitationRole || "technician";
        } else {
          return res
            .status(400)
            .json({ error: "Invalid or expired invitation token" });
        }
      } else {
        // Regular signup without invitation - default to technician
        userRole = "technician";
      }
    }

    let userData = {
      name,
      email,
      phone,
      password, // Will be hashed automatically by the model's pre-save hook
      role: userRole,
      address: {
        city: "Islamabad",
      },
    };

    // Handle invitation token if present
    let invitationData = null;
    if (invitation_token) {
      console.log("Looking for invitation with token:", invitation_token);
      console.log("Current time:", Date.now());

      // First, let's check if any user with this token exists
      const tokenExists = await User.findOne({
        invitationToken: invitation_token,
      }).select("+invitationToken +invitationRole");

      console.log("User with token exists:", tokenExists ? "YES" : "NO");
      if (tokenExists) {
        console.log("Token user details:", {
          email: tokenExists.email,
          role: tokenExists.role,
          invitationRole: tokenExists.invitationRole,
          invitationExpires: tokenExists.invitationExpires,
          isExpired: tokenExists.invitationExpires < Date.now(),
        });
      }

      // Now check with expiration
      invitationData = await User.findOne({
        invitationToken: invitation_token,
        invitationExpires: { $gt: Date.now() },
      }).select("+invitationToken +invitationRole");

      console.log("Valid invitation found:", invitationData ? "YES" : "NO");
      if (invitationData) {
        console.log("Valid invitation details:", {
          email: invitationData.email,
          role: invitationData.role,
          invitationRole: invitationData.invitationRole,
          expires: invitationData.invitationExpires,
        });
      }

      if (!invitationData) {
        console.log("Invalid or expired invitation token");
        return res
          .status(400)
          .json({ error: "Invalid or expired invitation token" });
      }
    }

    // Check for existing users only if this is NOT an invited user
    if (!invitationData) {
      let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      if (existingUser) {
        // Check if this is a pending user who has already paid (from webhook)
        if (
          existingUser.role === "pending" &&
          existingUser.customerId &&
          existingUser.hasAccess
        ) {
          console.log(
            "Found pending user with payment, updating to admin:",
            email
          );
          // Update the existing user with password and role
          existingUser.name = name;
          existingUser.phone = phone || existingUser.phone;
          existingUser.password = password;
          existingUser.role = "admin"; // Set as admin since they paid
          existingUser.emailVerified = true;

          try {
            await existingUser.save();
            console.log("Successfully updated pending user to admin");

            // Generate JWT token
            const token = jwt.sign(
              {
                userId: existingUser._id,
                email: existingUser.email,
                role: existingUser.role,
              },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
            );

            return res.status(201).json({
              message: "Account activated successfully! You can now login.",
              user: {
                id: existingUser._id,
                name: existingUser.name,
                email: existingUser.email,
                role: existingUser.role,
              },
              token,
            });
          } catch (error) {
            console.error("Error updating pending user:", error);
            return res
              .status(500)
              .json({ error: "Failed to activate account. Please try again." });
          }
        } else {
          console.log("User already exists with email/phone:", {
            email,
            phone,
          });
          // Check which field is causing the conflict
          const emailExists = await User.findOne({ email });
          const phoneExists = await User.findOne({ phone });

          if (emailExists && phoneExists) {
            return res
              .status(400)
              .json({
                error:
                  "Both email and phone number are already in use. Please use different credentials or try logging in.",
              });
          } else if (emailExists) {
            return res
              .status(400)
              .json({
                error:
                  "An account with this email already exists. Please use a different email or try logging in.",
              });
          } else {
            return res
              .status(400)
              .json({
                error:
                  "An account with this phone number already exists. Please use a different phone number.",
              });
          }
        }
      }
    }

    // Handle tenant association based on role
    if (userRole === "admin") {
      // Admin creates and owns a tenant
      const Tenant = require("../models/Tenant");
      const tenant = new Tenant({
        name: `${name}'s Farm`,
        email: email,
        business_type: "farm",
        created_by: null, // Will be set after user creation
      });
      await tenant.save();
      userData.owned_tenant_id = tenant._id;
    } else if (userRole === "manager" || userRole === "technician") {
      // Manager and Technician belong to an existing tenant
      const Tenant = require("../models/Tenant");
      const existingTenant = await Tenant.findOne().sort({ created_at: -1 });
      if (existingTenant) {
        userData.tenant_id = existingTenant._id;
      }
    }

    // If this is an invited user, update the invitation record instead of creating new
    if (invitationData) {
      console.log("Updating invitation record for user:", email);
      // Update the existing invitation record with the new user data
      invitationData.name = name;
      invitationData.phone = phone || invitationData.phone; // Keep existing phone if not provided
      invitationData.password = password;
      invitationData.role = userRole;
      invitationData.invitationToken = undefined;
      invitationData.invitationExpires = undefined;
      invitationData.emailVerified = true;

      // Ensure tenant_id is set for invited users
      if (userRole === "manager" || userRole === "technician") {
        const Tenant = require("../models/Tenant");
        const existingTenant = await Tenant.findOne().sort({ created_at: -1 });
        if (existingTenant) {
          invitationData.tenant_id = existingTenant._id;
          console.log("Set tenant_id for invited user:", existingTenant._id);
        }
      }

      console.log("Saving updated user record...");
      try {
        await invitationData.save();
        console.log("User record saved successfully");
        console.log("Final user data:", {
          id: invitationData._id,
          name: invitationData.name,
          email: invitationData.email,
          role: invitationData.role,
          emailVerified: invitationData.emailVerified,
          tenant_id: invitationData.tenant_id,
        });
        res.status(200).json({ msg: "User Registered Successfully" });
      } catch (saveError) {
        console.error("Error saving user record:", saveError);
        res
          .status(500)
          .json({ error: "Failed to save user data: " + saveError.message });
      }
    } else {
      // Create new user
      let user = new User(userData);
      await user.save();

      // Update tenant's created_by if this is an admin
      if (userRole === "admin" && userData.owned_tenant_id) {
        const Tenant = require("../models/Tenant");
        await Tenant.findByIdAndUpdate(userData.owned_tenant_id, {
          created_by: user._id,
        });
      }

      res.status(200).json({ msg: "User Registered Successfully" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "hammad@gmail.com"
 *               password:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
// Login Route
router.post("/login", async (req, res) => {
  const token = req.header("Authorization");
  if (token) {
    return res.status(401).json({ error: "Already Logged In" });
  }
  const { email, password } = req.body;

  try {
    // Include password in the query since it's select: false by default
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    if (user.blocked) {
      console.log("User blocked:", user.email);
      return res.status(400).json({ error: "Account Blocked" });
    }

    // Use the model's comparePassword method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch for user:", user.email);
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        name: user.fullName || user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        hasAccess: user.hasAccess,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          id: user.id,
          role: user.role,
          avatar: user.avatar,
          name: user.fullName || user.name,
          email: user.email,
          phone: user.phone,
          hasAccess: user.hasAccess,
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/upload-image:
 *   post:
 *     summary: Upload an image
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *       401:
 *         description: Unauthorized
 */
// Upload Image Route
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    const result = await uploadFile(req);
    res.status(200).json({ image_url: result.secure_url });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "An error occurred while uploading the image" });
  }
});

/**
 * @swagger
 * /auth/upload-profilePic:
 *   post:
 *     summary: Upload a profile picture
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *       401:
 *         description: Unauthorized
 */
// Upload Profile Picture Route
router.post(
  "/upload-profilePic",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const result = await uploadFile(req);
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      user.avatar = result.secure_url;
      await user.save();
      res.status(200).json({ avatar: result.secure_url });
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ error: "An error occurred while uploading the avatar" });
    }
  }
);

/**
 * @swagger
 * /auth/auth/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Route to change password
router.patch("/auth/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Both current password and new password are required",
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    // Get user from database with password field
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password using model method
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // Set new password (will be hashed automatically by the model's pre-save hook)
    user.password = newPassword;

    // Save updated user
    await user.save();

    res.json({
      message: "Password updated successfully",
      timestamp: new Date(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/forget-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
// Route to send password reset email
router.post("/forget-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    console.log("Password reset token generated:", resetToken);
    console.log("Token expiry:", new Date(resetTokenExpiry));
    // Construct reset link
    const resetLink = `${process.env.FRONT_END_URL}/auth/reset-password?token=${resetToken}`;
    // Create HTML email content
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">Password Reset Request</h2>
                <p style="color: #4a5568;">Hello <b>${
                  user.name || user.email
                }</b>,</p>
                <p style="color: #4a5568;">We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
                <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #3182ce; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                <p style="color: #718096; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} FarmHome. All rights reserved.</p>
            </div>
        `;
    // Send email with HTML content
    await sendEmail(
      user.email,
      "Password Reset Request",
      `Click the link to reset your password: ${resetLink}`,
      html
    );
    res
      .status(200)
      .json({ message: "Password reset email sent", resetLink: resetLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Bad request
 *       404:
 *         description: Invalid or expired token
 */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ error: "Token, newPassword, and confirmPassword are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }
  try {
    // Explicitly select the reset password fields to ensure they're included
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      console.log(
        "No user found with token:",
        token,
        "Current time:",
        Date.now()
      );
      return res.status(404).json({ error: "Invalid or expired token" });
    }
    // Set new password (will be hashed automatically by the model's pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Debug route to check if a reset token exists (remove in production)
router.get("/debug-token/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.json({
        found: false,
        message: "No user found with this token",
      });
    }

    const isExpired = user.resetPasswordExpires < Date.now();

    res.json({
      found: true,
      expired: isExpired,
      tokenExpires: new Date(user.resetPasswordExpires),
      currentTime: new Date(),
      userEmail: user.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/check-token:
 *   post:
 *     summary: Check if a JWT token is valid
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or expired token
 */
// Route to check if JWT token is valid
router.post("/check-token", async (req, res) => {
  // Try to get token from Authorization header or body

  console.log(req.body);

  let token = req.header("Authorization");
  if (!token && req.body.token) {
    token = req.body.token;
  }
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  // Remove 'Bearer ' prefix if present
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true, payload: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
});

/**
 * @swagger
 * /auth/user/{userId}:
 *   get:
 *     summary: Get user details by user ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       400:
 *         description: Invalid userId format
 *       404:
 *         description: User not found
 */
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  // Validate userId format (MongoDB ObjectId)
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    return res
      .status(400)
      .json({ error: "Invalid userId format. Must be a MongoDB ObjectId." });
  }
  try {
    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
// delete in production
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/create-manager:
 *   post:
 *     summary: Create a new manager (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manager created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/create-manager", auth, admin, async (req, res) => {
  const { name, email, phone, password, location } = req.body;
  try {
    if (!name || !email || !phone || !password || !location) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or phone is already in use" });
    }
    let user = new User({
      name,
      email,
      phone,
      password,
      role: "manager",
      location,
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res
      .status(201)
      .json({ message: "Manager created successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/create-assistant:
 *   post:
 *     summary: Create a new assistant (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assistant created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/create-assistant", auth, admin, async (req, res) => {
  const { name, email, phone, password, location } = req.body;
  try {
    if (!name || !email || !phone || !password || !location) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or phone is already in use" });
    }
    let user = new User({
      name,
      email,
      phone,
      password,
      role: "assistant",
      location,
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res
      .status(201)
      .json({ message: "Assistant created successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 avatar:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update user profile (name, phone)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update user profile (name, phone)
router.patch("/profile", auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name && !phone) {
      return res
        .status(400)
        .json({ error: "At least one of name or phone is required" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name) user.name = name;
    if (phone) user.phone = phone;
    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get current authenticated user info
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language || "en",
      phone: user.phone,
      avatar: user.avatar,
      hasAccess: user.hasAccess || "none",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/invite-team-member:
 *   post:
 *     summary: Invite a team member (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, technician]
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/invite-team-member", auth, async (req, res) => {
  try {
    console.log("=== INVITE TEAM MEMBER DEBUG ===");
    console.log("Request body:", req.body);
    console.log("User from auth:", req.user);

    const { email, role, name } = req.body;

    // Only admin can invite team members
    if (req.user.role !== "admin") {
      console.log("Access denied: User role is", req.user.role);
      return res
        .status(403)
        .json({ error: "Only admins can invite team members" });
    }

    if (!email || !role) {
      console.log("Validation failed: Missing email or role");
      return res.status(400).json({ error: "Email and role are required" });
    }

    if (!["manager", "technician"].includes(role)) {
      console.log("Validation failed: Invalid role");
      return res
        .status(400)
        .json({ error: "Role must be manager or technician" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", existingUser.email);
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    console.log("Creating invitation with token:", invitationToken);

    // Create invitation record
    const invitation = new User({
      email,
      name: name || email.split("@")[0],
      role: "pending", // Temporary role until they accept invitation
      invitationToken,
      invitationExpires,
      invitationRole: role,
      invitedBy: req.user.id,
      tenant_id: req.user.tenant_id || req.user.owned_tenant_id,
      emailVerified: false,
    });

    console.log("Saving invitation to database...");
    await invitation.save();
    console.log("Invitation saved successfully");

    // Create invitation link
    const invitationLink = `${process.env.FRONT_END_URL}/auth/signup?token=${invitationToken}`;
    console.log("Invitation link:", invitationLink);

    // Send invitation email
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">Team Invitation</h2>
                <p style="color: #4a5568;">Hello <b>${
                  name || email.split("@")[0]
                }</b>,</p>
                <p style="color: #4a5568;">You have been invited to join <b>GrainHero</b> as a <b>${role}</b>.</p>
                <p style="color: #4a5568;">Click the button below to accept the invitation and create your account:</p>
                <a href="${invitationLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #3182ce; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
                <p style="color: #718096; font-size: 13px;">This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
        `;

    console.log("Sending email to:", email);
    await sendEmail(
      email,
      "Team Invitation - GrainHero",
      `You have been invited to join GrainHero. Click here to accept: ${invitationLink}`,
      html
    );
    console.log("Email sent successfully");

    res.status(200).json({
      message: "Invitation sent successfully",
      invitationLink: invitationLink, // For testing purposes
    });
  } catch (err) {
    console.error("Invite team member error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/verify-invitation:
 *   get:
 *     summary: Verify invitation token
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation is valid
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-invitation", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const invitation = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() },
    }).select("+invitationToken +invitationRole");

    if (!invitation) {
      return res
        .status(400)
        .json({ error: "Invalid or expired invitation token" });
    }

    res.status(200).json({
      valid: true,
      email: invitation.email,
      role: invitation.invitationRole,
      name: invitation.name,
    });
  } catch (err) {
    console.error("Verify invitation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Test email endpoint (remove in production)
router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">GrainHero Email Test</h2>
                <p style="color: #4a5568;">Hello!</p>
                <p style="color: #4a5568;">This is a test email from GrainHero to verify that email sending is working correctly.</p>
                <p style="color: #718096; font-size: 13px;">If you received this email, the email system is configured properly!</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
        `;

    await sendEmail(
      email,
      "GrainHero Email Test",
      "This is a test email from GrainHero",
      html
    );

    res.status(200).json({
      success: true,
      message: "Test email sent successfully!",
    });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({
      error: "Failed to send test email: " + err.message,
    });
  }
});

module.exports = router;
