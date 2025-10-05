"use client";

import { useAuth } from "@/app/[locale]/providers";
import { User } from "@/app/[locale]/providers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { config } from "@/config";

export default function ProfilePage() {
  const { user, isLoading, updateLanguage } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<User>>(user || {});
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem("token");

  // Load avatar from localStorage on mount
  useEffect(() => {
    const storedAvatar = localStorage.getItem("avatar");
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    } else if (user && user.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
    // Optionally, set form as well
    if (user) {
      setForm(user);
    }
  }, [user]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>No user found.</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleProfilePicClick = () => {
    if (editMode && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${config.backendUrl}/auth/upload-profilePic`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      const data = await response.json();

      // Update the form with the new avatar URL
      setForm((prev: any) => ({ ...prev, avatarUrl: data.avatar }));
      setAvatarUrl(data.avatar); // update avatar state

      // Update user in localStorage
      const updatedUser = { ...user, avatarUrl: data.avatar };
      localStorage.setItem("farm-home-user", JSON.stringify(updatedUser));
      localStorage.setItem("avatar", data.avatar); // update avatar in localStorage

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    // Only update language for now, extend as needed
    if (form.language && form.language !== user.language) {
      updateLanguage(form.language);
    }
    // Update other fields in memory (localStorage)
    const updatedUser = { ...user, ...form };
    localStorage.setItem("farm-home-user", JSON.stringify(updatedUser));
    window.location.reload(); // To refresh context
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gray-50">
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-6">
        <div className="relative">
          <Avatar className="size-24">
            <AvatarImage src={avatarUrl || undefined} alt={form.name ?? "User"} />
            <AvatarFallback>{form.name ? form.name[0] : "U"}</AvatarFallback>
          </Avatar>
          {editMode && (
            <div
            className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer hover:opacity-60 transition-all bg-white/50 opacity-100"
            onClick={handleProfilePicClick}
          >
          

              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input name="name" value={form.name ?? ""} onChange={handleChange} disabled={!editMode} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input name="email" value={form.email ?? ""} onChange={handleChange} disabled={!editMode} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input name="phone" value={form.phone ?? ""} onChange={handleChange} disabled={!editMode} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <Input name="role" value={form.role ?? ""} disabled />
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          {editMode ? (
            <>
              <Button onClick={handleSave} variant="default">Save</Button>
              <Button onClick={() => { setEditMode(false); setForm(user); }} variant="secondary">Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setEditMode(true)} variant="outline">Edit Profile</Button>
          )}
        </div>
        <div className="mt-6 w-full text-center">
          <Link href="/profile/reset" className="text-blue-600 hover:underline text-sm">Reset Password</Link>
        </div>
      </Card>
    </div>
  );
} 