import Firebase from 'firebase';

const firebaseConfig = {
  apiKey: 'AIzaSyAUV6RmnLzADzr_PGl0s8Sg9hvvmarUGHE',
  authDomain: 'solar-project-c4806.firebaseapp.com',
  databaseURL: 'https://solar-project-c4806.firebaseio.com',
  projectId: 'solar-project-c4806',
  storageBucket: 'solar-project-c4806.appspot.com',
  messagingSenderId: '459115865620',
  appId: '1:459115865620:web:0b0fde37699a8eed7e6901',
};

const app = Firebase.initializeApp(firebaseConfig);
export const db = app.database();
