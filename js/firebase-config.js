// firebase-config.js
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyDxZvpKrQ236bCTOLSzoMrHRR8BINTI-Sw",
    authDomain: "atlantiscorp-af211.firebaseapp.com",
    projectId: "atlantiscorp-af211",
    storageBucket: "atlantiscorp-af211.firebasestorage.app",
    messagingSenderId: "36612462515",
    appId: "1:36612462515:web:7683c3b686d308450addc6",
    measurementId: "G-NE54KLXY3Z"
  };
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.database();
  window.auth = firebase.auth();
})();