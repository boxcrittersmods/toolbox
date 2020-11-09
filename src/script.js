(function () {
	"use strict";
	sortable("#layers");

	async function getJSON(url) {
		let response = await fetch(url);
		return await response.json();
	}

	async function getManifest(type) {
		let m = await getJSON("https://api.boxcrittersmods.ga/manifests");
		return await getJSON(m[type].src);
	}

	function loadImage(url) {
		let img = new Image();
		return new Promise((resolve, reject) => {
			img.onload = () => {
				resolve(img);
			};
			img.src = url;
		});
	}
	function loadMusic(url) {
		let music = new Audio();
		music.src = url;
		/*return new Promise((resolve, reject) => {
			music.onload = () => {
				resolve(music);
			};
		});*/
		return music;
	}


	let canvas = document.querySelector("canvas"),
		audio = document.querySelector("audio"),
		context = canvas.getContext("2d");
	canvas.style.width = "100%";

	async function initRoom() {
		let { value, room } = this.selectedOptions[0];
		console.log(value, room);
		canvas.room = room;
		canvas.width = room.width;
		canvas.height = room.height;
		if (!this.frame) this.frame = 0;

		context.fillRect(0, 0, canvas.width, canvas.height);


		let spriteSheet = room.spriteSheet = typeof room.spriteSheet == "string" ? await getJSON(room.spriteSheet) : room.spriteSheet,
			layout = room.layout;

		for (let media in room.media) {
			let url = room.media[media];
			if (typeof (url) == "object") {
				console.log("ok");
				continue;
			}

			let urlParts = url.split("."),
				ext = urlParts[urlParts.length - 1];

			switch (ext) {
				case "png":
					room.media[media] = await loadImage(url);
					break;
				case "mp3":
					room.media[media] = await loadMusic(url);
					break;
				default:
					console.warn("No File handler for " + ext + " files");
					break;
			}
		}
		if (spriteSheet.images) spriteSheet.images = await Promise.all(spriteSheet.images.map(async url => typeof url == "string" ? await loadImage(url) : url));

		if (void 0 != room.media.music) {
			audio.src = room.media.music.src;
		}
		else { audio.src = ""; }

		if (layout) {
			if (Array.isArray(layout.playground) && Array.isArray(layout.playground[0])) {
				layout.playground = [].concat.apply([], layout.playground);
			}
			layout.playground.sort((a, b) => a.y - b.y);
		}
	}


	async function RoomInit() {
		let roomSelect = document.getElementById("select-room"),
			rooms = await getManifest("rooms");

		roomSelect.addEventListener("change", initRoom);
		for (var room of rooms) {
			room.roomId = room.roomId || room.id;
			room.name = room.name || room.roomId;
			let roomOption = document.createElement("option");
			roomOption.value = room.roomId;
			roomOption.text = room.name;
			roomOption.room = room;
			roomSelect.add(roomOption, null);
		}

		initRoom.call(roomSelect);
	}

	setTimeout(() => { RoomInit(); }, 10);

})();