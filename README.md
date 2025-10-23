# GrainHero - AI-Powered Grain Storage Management System

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB)

### Installation & Setup

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend in development mode |
| `npm run dev:backend` | Start only backend server |
| `npm run dev:frontend` | Start only frontend server |
| `npm run start` | Start both servers in production mode |
| `npm run build` | Build frontend for production |
| `npm run install:all` | Install dependencies for all projects |

### Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Documentation:** http://localhost:5000/api/docs

### Environment Setup

Make sure you have a `.env` file in the `farmHomeBackend-main` directory with:

```env
MONGO_USER=your_mongo_user
MONGO_PASS=your_mongo_password
DATABASE_NAME=grainhero
JWT_SECRET=your_jwt_secret
PORT=5000
FRONT_END_URL=http://localhost:3000
```

### Project Structure

```
GrainHero/
├── farmHomeBackend-main/     # Backend API (Node.js + Express)
├── farmHomeFrontend-main/    # Frontend (Next.js + React)
├── SmartBin-RiceSpoilage-main/  # ML Models
└── package.json              # Root package.json for easy management
```

### Troubleshooting

1. **Port conflicts:** Make sure ports 3000 and 5000 are available
2. **MongoDB connection:** Check your MongoDB Atlas connection string
3. **Dependencies:** Run `npm run install:all` if you encounter module errors

### Development

- Backend uses nodemon for auto-restart
- Frontend uses Next.js hot reload
- Both servers run concurrently with `npm run dev`
