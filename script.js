const config = {
    apiKey: "AIzaSyAjKp_f5F1Tp22oJGQscVHQ6YYgXQH02VE",
    authDomain: "anime-sama-radio.firebaseapp.com",
    databaseURL: "https://anime-sama-radio.firebaseio.com",
    projectId: "anime-sama-radio",
    storageBucket: "anime-sama-radio.appspot.com",
    messagingSenderId: "709190102912"
}

firebase.initializeApp(config);

let d = document,
    c = console.log,
    f = firebase

const db = f.database(),
    songsRef = db.ref().child('songs'),
    storage = f.storage(),
    bucket = storage.ref(),
    imgRef = bucket.child('img'),
    createSong = d.getElementById('createSong'),
    songName = d.getElementById('songname'),
    songType = d.getElementById('songtype'),
    songNumber = d.getElementById('songnumber'),
    songImage = d.getElementById('songimage')

//Funciones y variables útiles

let arraySonginQueue = [],
    notificationBox = d.getElementById('notification-box'),
    notificationText = d.getElementById('notification-box-text'),
    itemLoader = d.getElementById('item-loader')
    itemLoaderCounter = d.getElementById('item-loader-counter')


function notificationAnimation(successOrNo) {
    notificationText.style.backgroundColor = successOrNo ? 'rgb(112, 219, 153)' : 'rgb(255, 72, 72)'
    notificationBox.classList.add('appearNotification')
    notificationText.innerText = successOrNo ? '¡Canción creada con éxito!' : '¡Ha ocurrido un error! Intentalo nuevamente en unos segundos. Si el problema persiste, contacte al administrador'
    setTimeout(() => {notificationBox.classList.remove('appearNotification')},8000)
}


function slugify(string) {
  return string
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

//Leemos y ordenamos lista de canciones

let list = d.getElementById('song-list-box'),
  posibleList = d.getElementById('add-song-box-list')

function AddToList(song, listBox, key) {

  let div = document.createElement("div")
  div.className += "song-item"
  div.dataset.key = key
  div.innerHTML = `
  <img class="song-item-image" src="${song.image}" alt="${song.name}"/>
  <div class="song-item-description">
    <h4>${song.name}</h4>
    <p>${song.type} ${song.number}</p>
  </div>
  <div onclick="deleteSong(event, '${key}')" class="song-item-delete"><span>x</span></div>
  `
  listBox.appendChild(div)
}

firebase.database().ref('songs/').orderByChild('inList').equalTo(true).once('value').then(function(songList) {
    songList.forEach(function(songInDB) {
        var song = songInDB.val();

        arraySonginQueue.push({
            name: song.name,
            type: song.type,
            number: song.number,
            image: song.image,
            inList: true,
            date: song.date,
            key: songInDB.key
        })
    });
    renderSongList(arraySonginQueue)
});

//Creamos elemento en la base de datos

createSong.addEventListener('submit', e => {
    
    e.preventDefault()

    
    try {
        itemLoader.style.display = 'flex'

    let file = songImage.files[0],
        fileRef = imgRef.child(file.name)
        uploadImg = fileRef.put(file)

    uploadImg.on('state_changed', function(snapshot){
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        itemLoaderCounter.innerText = 'Creando canción...  '+ progress+'%'

      }, function(error) {
        notificationAnimation(false)
        itemLoader.style.display = 'none'
      }, function() {
        // Handle successful uploads on complete
        uploadImg.snapshot.ref.getDownloadURL().then( url => {

            let id = songsRef.push().key,
                timeNow = new Date(),  
                songData = {
                    name: songName.value,
                    type: songType.value,
                    number: songNumber.value,
                    image: url,
                    inList: true,
                    date: timeNow
                },
                updateSong = {}
        
            updateSong[`/${id}`] = songData
            
            songsRef.update(updateSong)
            songData.key = id
            arraySonginQueue.push(songData)
            createSong.reset()
            itemLoader.style.display = 'none'

            notificationAnimation(true)

            //Renderizando en lista
            renderSongList(arraySonginQueue);
        });
      });

    }catch(err){
        notificationAnimation(false)
        itemLoader.style.display = 'none'
    }
})


//Buscar canción y agregar a cola

let addSongInput = document.getElementById('add-song-input')

function searchSong(evt) {
    
    evt = window.event;
    var charCode = evt.which || evt.keyCode;
    var charStr = String.fromCharCode(charCode);
    if (/[a-zA-Z0-9-_ ]/i.test(charStr)) {

        while(posibleList.firstChild) {
            posibleList.removeChild(posibleList.firstChild);
        }

        let queryString = addSongInput.value.replace(/\b\w/g, l => l.toUpperCase())
        const  temporalRef = firebase.database().ref('songs/').orderByChild("name").startAt(queryString).endAt(queryString + '\uf8ff').limitToFirst(5)
   
       
        temporalRef.once('value').then(function(songList) {
   
           songList.forEach(function(songInDB) {
               var song = songInDB.val();
          
               let div = document.createElement("div")
               div.classList.add('song-item')
               div.dataset.key = songInDB.key
               if(song.inList) { div.classList.add('song-item-already-in-list')}
               div.innerHTML = `
               <img class="song-item-image" src="${song.image}" alt="${song.name}"/>
               <div class="song-item-description">
                   <h4>${song.name}</h4>
                   <p>${song.type} ${song.number}</p>
               </div>
               <div onclick="addFromPosible(this, '${songInDB.key}')" class="song-item-add"><span>+</span></div>
               `
               posibleList.appendChild(div)
                 
           });
        });
    }

}

//Eliminar y Agregar canción de cola

function deleteSong(songID) {
    
    let songRef = db.ref('songs/'+songID),
        divs = d.querySelectorAll("[data-key="+songID+"]")

    songRef.update({inList: false})
    divs.forEach(el => el.classList.remove('song-item-already-in-list'))
    
}

function addFromPosible(div, songID) {
    
    let songRef = db.ref('songs/'+songID),
        date = new Date()
    
    songRef.update({inList: true, date: date})
    div.parentNode.classList.add('song-item-already-in-list')
    
}

db.ref('songs/').on('child_changed', data => {

    let index = arraySonginQueue.findIndex(x => x.key == data.key),
        song = data.val()
    if(index>-1) {
        arraySonginQueue[index].inList = song.inList
    }else {
        let date = new Date()
        arraySonginQueue.push({
            name: song.name,
            type: song.type,
            number: song.number,
            image: song.image,
            inList: true,
            date: date,
            key: data.key
        })
    }
    arraySonginQueue = arraySonginQueue.filter(x => x.inList == true)

    renderSongList(arraySonginQueue)
    
})

// Renderizar cola de pedidos

function renderSongList(arr) {

    arr.sort((a,b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0))

    while(list.firstChild) {
        list.removeChild(list.firstChild);
    }
    
    for (let i = 0; i < arr.length; i++) {

        let song = arr[i]
        
        let div = document.createElement("div")
        div.classList.add('song-item')
        div.dataset.key = song.key
        div.innerHTML = `
        <img class="song-item-image" src="${song.image}" alt="${song.name}"/>
        <div class="song-item-description">
            <h4>${song.name}</h4>
            <p>${song.type} ${song.number}</p>
        </div>
        <div onclick="deleteSong('${song.key}')" class="song-item-delete"><span>x</span></div>
        `
        list.appendChild(div)
        
    }

    listHasChanged(arr);
}

//Encontrar la primera y segunda canción en lista

let firstSongPlayingName = d.getElementById('first-song-in-list-name'),
    firstSongPlayingTypeNumber = d.getElementById('first-song-in-list-type-number'),
    firstSongPlayingImage = d.getElementById('first-song-in-list-image'),
    secondSongPlayingName = d.getElementById('second-song-in-list-name'),
    secondSongPlayingTypeNumber = d.getElementById('second-song-in-list-type-number')

function listHasChanged(arr) {

    let firstSong = arr[0],
        secondSong = arr[1]

        firstSongPlayingName.innerHTML = firstSong.name
        firstSongPlayingTypeNumber.innerHTML = firstSong.type+' '+firstSong.number
        firstSongPlayingImage.src = firstSong.image
        firstSongPlayingName.dataset.key = firstSong.key

        secondSongPlayingName.innerHTML = secondSong.name
        secondSongPlayingTypeNumber.innerHTML = secondSong.type+' '+secondSong.number
        secondSongPlayingName.dataset.key = secondSong.key





}