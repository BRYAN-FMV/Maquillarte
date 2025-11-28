// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJMoiCee97CwftDSaKuHrJfcZFqZS1sDw",
  authDomain: "maquillarte.firebaseapp.com",
  projectId: "maquillarte",
  storageBucket: "maquillarte.firebasestorage.app",
  messagingSenderId: "137329487938",
  appId: "1:137329487938:web:51014fd3e36d29762bfddb",
  measurementId: "G-2JLM5XGB7L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);