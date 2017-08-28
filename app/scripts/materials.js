/* global firebase, window, document */

var config = {
  apiKey: 'AIzaSyDqqf7QUDwd5luyo-SoNSRc2DK00vXkgSA',
  authDomain: 'dcs-doctors.firebaseapp.com',
  databaseURL: 'https://dcs-doctors.firebaseio.com',
  projectId: 'dcs-doctors',
  storageBucket: 'dcs-doctors.appspot.com',
  messagingSenderId: '900480132916'
};


firebase.initializeApp(config);

var auth = firebase.auth();
var storageRef = firebase.storage().ref();
var db = firebase.database();

var file = null;

function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  file = evt.target.files[0];

  document.getElementById('file-label').style.display = 'none';
  if (!document.getElementById('file-name').value) {
    document.getElementById('file-name').value = file.name;
  }
}

function handleEditClick(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var target = evt.target || evt.srcElement;

  var id = (isMobile()) ?
             target.parentNode.parentNode.children[1].children[4].textContent :
             target.parentNode.parentNode.children[2].textContent;

  console.log(id);

  db.ref('records').child(id).once('value', function(snapshot) {
    var record = snapshot.val();

    var dialog = document.querySelector('#dialog-edit');

    var inp = document.querySelector('#file-name-edit');
    inp.value = record.name;
    document.querySelector('#file-label-edit').textContent = '';

    var createdAt = document.querySelector('#created-at');
    createdAt.value = record.createdAt;

    dialog.showModal();
  }, function(errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });
}

function saveRecord() {
  var val = document.querySelector('#file-name-edit').value;
  var id = document.querySelector('#created-at').value;

  db.ref('records/' + id).once('value', function(snapshot) {
    var record = {};
    Object.assign(record, snapshot.val());

    record.name = val;

    console.log(record);

    db.ref('records/' + id).set(record);
  }, function(errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });
}

function deleteRecord() {
  var id = document.querySelector('#created-at').value;
  db.ref('records/' + id).remove();
}

function handleButtonClick(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var uploadTask = storageRef.child('records/' + file.name).put(file, {contentType: file.type});

  uploadTask.on('state_changed', function(snapshot) {
    document.querySelector('.loader').style.display = 'block';

    // Observe state change events such as progress, pause, and resume
    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log('Upload is ' + progress + '% done');
    switch (snapshot.state) {
      case firebase.storage.TaskState.PAUSED:
        console.log('Upload is paused');
        break;
      case firebase.storage.TaskState.RUNNING:
        console.log('Upload is running');
        break;
      default:
        break;
    }
  }, function(error) {
    console.log(error);
  }, function() {
    var record = {
      name: document.getElementById('file-name').value || file.name,
      url: uploadTask.snapshot.downloadURL,
      type: file.type,
      createdAt: new Date()
    };

    // Submit record

    db.ref('records/' + record.createdAt).set(record);

    document.querySelector('.loader').style.display = 'none';
  });
}

window.onload = function() {
  if (isMobile()) {
    document.querySelector('#table').style.display = 'none';
    document.querySelector('#cards').style.display = '';
  } else {
    document.querySelector('#table').style.display = '';
    document.querySelector('#cards').style.display = 'none';
  }

  document.getElementById('file').addEventListener('change', handleFileSelect, false);
  document.getElementById('button').addEventListener('click', handleButtonClick, false);

  document.getElementById('edit').addEventListener('click', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    saveRecord();
  }, false);

  document.getElementById('delete').addEventListener('click', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    deleteRecord();
  }, false);

  var dialogButton = document.querySelector('#dialog-button');
  var dialog = document.querySelector('#dialog');
  var dialogEdit = document.querySelector('#dialog-edit');

  if (!dialog.showModal) {
    dialogPolyfill.registerDialog(dialog); /* global dialogPolyfill  */
  }
  if (!dialogEdit.showModal) {
    dialogPolyfill.registerDialog(dialogEdit);
  }

  dialogButton.addEventListener('click', function() {
    dialog.showModal();
  });
  dialog.querySelector('#close').addEventListener('click', function() {
    dialog.close();
  });
  dialogEdit.querySelector('#close-edit').addEventListener('click', function() {
    dialogEdit.close();
  });
  dialogEdit.querySelector('#edit').addEventListener('click', function() {
    dialogEdit.close();
  });
  dialogEdit.querySelector('#delete').addEventListener('click', function() {
    dialogEdit.close();
  });
  dialog.querySelector('#button').addEventListener('click', function() {
    dialog.close();
  });

  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('Anonymous user signed-in.', user);
      document.getElementById('file').disabled = false;
    } else {
      console.log('There was no anonymous session. Creating a new anonymous user.');
      // Sign the user in anonymously since accessing Storage requires the user to be authorized.
      auth.signInAnonymously();
    }
  });

  document.querySelector('.loader').style.display = 'block';
  document.querySelector('#table').style.display = 'none';
  db.ref('records').orderByChild('createdAt').on('value', function(snapshot) {
    var body;
    if (isMobile()) {
      body = document.getElementById('cards');
    } else {
      body = document.getElementById('table-body');
    }
    var html = '';

    snapshot.forEach(function(record) {
      html += templateRecord(record.val());
    });

    document.querySelector('.loader').style.display = 'none';
    if (!isMobile()) {
      document.querySelector('#table').style.display = '';
    }
    body.innerHTML = html;

    var btns = [].slice.call(document.getElementsByClassName('edit'));
    btns.forEach(function(button) {
      button.addEventListener('click', handleEditClick, false);
    });
  }, function(errorObject) {
    console.log('The read failed: ' + errorObject.code);
  });
};

function templateRecord(record) {
  return (isMobile()) ?
           '<div class="demo-updates mdl-card mdl-shadow--2dp mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--4-col-desktop">' +
              '<div class="mdl-card__title mdl-card--expand mdl-color--red-300">' +
                '<h2 class="mdl-card__title-text"><a href="' + record.url + '">' + record.name + '</a></h2>' +
              '</div>' +
              '<div class="mdl-card__supporting-text mdl-color-text--grey-600">' +
                '<p><b>Type: </b><div>' + record.type + '</div></p>' +
                '<p><b>Created at: </b><div>' + record.createdAt + '</div></p>' +
              '</div>' +
              '<div class="mdl-card__actions mdl-card--border">' +
                '<button class="edit mdl-button mdl-js-button mdl-js-ripple-effect">Edit</button>' +
              '</div>' +
           '</div>' :
           '<tr><td><a href="' +
                                 record.url + '">' +
                                 record.name + '</a></td><td>' +
                                 record.type + '</td><td>' +
                                 record.createdAt + '</td><td>' +
                                 '<button type="button" class="mdl-button mdl-js-button mdl-js-ripple-effect edit">Edit</button>' +
           '</td></tr>';
}

function isMobile() {
  return window.innerWidth < 1250;
}
