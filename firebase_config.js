// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAc0PAAzL0llquCFz4QNUiTOr5FnKtWh5U",
    authDomain: "moviepox-7ab66.firebaseapp.com",
    projectId: "moviepox-7ab66",
    storageBucket: "moviepox-7ab66.firebasestorage.app",
    messagingSenderId: "12872256401",
    appId: "1:12872256401:web:9211b4fecd4b2e9ff12830",
    measurementId: "G-NZ64PY1BR7",
    databaseURL: "https://moviepox-7ab66-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

window.firebaseAuth = auth;
window.firebaseDb = db;
