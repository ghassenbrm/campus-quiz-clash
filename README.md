# Campus Quiz Clash

A real-time quiz application for educational institutions, built with React and Firebase.

## 🚀 Features

- 🔐 Secure authentication with email/password
- 🎯 Real-time quiz competition
- 📊 Leaderboards (Personal, Classroom, University)
- 🏆 Weekly MVP calculation
- 📱 Responsive design
- 👨‍💼 Admin dashboard for content management

## 🛠️ Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase account

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/campus_quiz_clash_web.git
   cd campus_quiz_clash_web
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase configuration

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🔒 Security

- All Firebase credentials are stored in environment variables
- Firestore security rules are in place
- Sensitive files are excluded from version control

## 🔧 Deployment

1. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase login
   firebase init
   firebase deploy
   ```

## 📚 Documentation

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Vite](https://vitejs.dev/)
