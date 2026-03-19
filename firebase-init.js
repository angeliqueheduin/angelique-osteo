import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword }
  from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';

const app = initializeApp({
  apiKey:      'AIzaSyArS0ecp1f_SxrGvw70ieva0CR3XzoCrxI',
  authDomain:  'angelique-osteo.firebaseapp.com',
  databaseURL: 'https://angelique-osteo-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:   'angelique-osteo'
});

window._auth   = getAuth(app);
window._signIn = signInWithEmailAndPassword;