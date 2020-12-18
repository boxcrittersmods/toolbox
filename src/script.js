(function () {
	"use strict";

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
			if (url == "canvas") {
				resolve(canvas);
				return;
			}
			img.onload = () => {
				resolve(img);
			};
			img.src = url;
		});
	}


	let table = document.querySelector("tbody"),
		canvas = document.querySelector("canvas#roomPreviewCanvas"),
		layerPreviewCanvas = document.querySelector("canvas#layerPreview"),
		audio = document.querySelector("audio"),
		animateButton = document.querySelector("#playAnimation"),
		tickButton = document.querySelector("#tickAnimation"),
		context = canvas.getContext("2d"),
		layerPreviewContext = layerPreviewCanvas.getContext("2d");

	canvas.images = {};
	canvas.fps = 60;
	Object.defineProperty(canvas, "animating", {
		get() {
			return animateButton.classList.contains("enabled");
		}
	});

	async function drawLayer({ visible, src, posX = 0, posY = 0, originX = 0, originY = 0, frameX = 0, frameY = 0, frameRegX = 0, frameRegY = 0, frameW = 0, frameH = 0, alpha = 1 }) {

		if (visible === false) return;
		//console.log("Drawing", { visible, src, posX, posY, originX, originY, frameX, frameY, frameW, frameH, frameRegX, frameRegY });
		if (src == "canvas") {
			canvas.width = frameW;
			canvas.height = frameH;
			return;
		};

		let image = canvas.images[src];
		if (!image) image = canvas.images[src] = await loadImage(src);
		context.globalAlpha = alpha;
		context.drawImage(image, frameX, frameY, frameW, frameH, posX - originX - frameRegX, posY - originY - frameRegY, frameW, frameH);

	}

	async function drawLayerPreview({ src, frameX = 0, frameY = 0, frameRegX = 0, frameRegY = 0, frameW = 0, frameH = 0 }) {
		let width = frameW,
			height = frameH,
			ratio = width / height,
			maxH = 400, maxW = 400;
		if (height > maxH) {
			width = maxH * ratio;
			height = maxH;
		}
		if (width > maxW) {
			height = maxW / ratio;
			width = maxW;
		}
		layerPreviewCanvas.height = height;
		layerPreviewCanvas.width = width;
		let image = canvas.images[src];
		if (!image) image = canvas.images[src] = await loadImage(src);
		layerPreviewContext.drawImage(image, frameX, frameY, frameW, frameH, 0, 0, width, height);
	}

	function updateFrameInfo(layer) {
		layer.frameNo %= layer.frames.length;
		let frame = layer.frames[layer.frameNo];
		Object.assign(layer, {
			src: layer.images[frame[4]],
			frameX: frame[0],
			frameY: frame[1],
			frameRegX: frame[5],
			frameRegY: frame[6],
			frameW: frame[2],
			frameH: frame[3],
		});

	}
	function tickAnimation() {
		if (!canvas.layers) return;
		for (let layer of canvas.layers) {
			if (!layer.frameNo) continue;
			layer.frameNo++;
			updateFrameInfo(layer);
		}
		refreshCanvas();
	}

	function tick() {
		setTimeout(function () {
			requestAnimationFrame(tick);
			if (!canvas.animating) return;
			tickAnimation();
		}, 1000 / canvas.fps);
	}
	requestAnimationFrame(tick);

	tickButton.addEventListener("click", tickAnimation);

	async function refreshCanvas() {
		for (let layer of canvas.layers) {
			if (layer.previewing) await drawLayerPreview(layer);
			await drawLayer(layer);
		}
	}
	function initTable() {
		/*
		<tr>
			<td class="drag-widget"><div class="burger"></div></td>
			<td><input type="checkbox" name="visability" checked></td>
			<td><input type="url" name="sprite-sheet"></td>
			<td><input type="number" name="frame"></td>
			<td><input type="number" name="pos-x"></td>
			<td><input type="number" name="pos-y"></td>
			<td><input type="number" name="crop-w"></td>
			<td><input type="number" name="crop-h"></td>
			<td><input type="number" name="pos-x"></td>
			<td><input type="number" name="pos-y"></td>
			<td><input type="number" name="origin-x"></td>
			<td><input type="number" name="origin-y"></td>
			<td><input type="number" name="size-w"></td>
			<td><input type="number" name="size-h"></td>
		</tr>
		*/

		table.innerHTML = "";

		function createMoveWidget(row, immoveable) {
			let burger = document.createElement("div"),
				cell = row.insertCell();
			cell.appendChild(burger);
			cell.classList.add("drag-widget");
			if (!immoveable) burger.classList.add("burger");

		}

		function createCell(row, name, value, type) {
			let input = document.createElement('input');
			let cell = row.insertCell();
			cell.appendChild(input);
			input.disabled = void 0 == value || value == "canvas";
			input.id = input.name = name;
			input.type = type;
			input.layer = row.layer;
			if (type == "checkbox") {
				input.checked = typeof value == "boolean" ? value : true;
			} else {
				input.value = value;
			}

			Object.defineProperty(row.layer, name, {
				get() {
					if (input.type == "checkbox") {
						return input.checked;
					}
					return input.value;
				},
				set(value) {
					if (input.type == "checkbox") {
						input.checked = typeof value == "boolean" ? value : true;
					} else {
						input.value = value;
					}
				}
			});

			input.onchange = function () {
				this.layer[this.id] = this.type == "checkbox" ? this.checked : this.value;
				console.log(this.id, this.layer);
				if (this.id == "frameNo") {
					updateFrameInfo(this.layer);
				}
				refreshCanvas();
			};

			if (type == "number") {
				cell.classList.add("hide-mobile");
				input.lowestScrollDelta = 1e999;
				input.addEventListener("mouseenter", e => {
					document.body.classList.add("scroll-disable");
				});
				input.addEventListener("mouseleave", e => {
					document.body.classList.remove("scroll-disable");
				});
				input.addEventListener("mousewheel", e => {
					let val = parseFloat(input.layer[name]);
					if (input.lowestScrollDelta > e.wheelDelta) input.lowestScrollDelta = e.wheelDelta;
					console.log(e.wheelDelta, e.wheelDeltaX, e.wheelDeltaY);
					if (!input.disabled) input.layer[name] = val + e.wheelDelta / input.lowestScrollDelta * 4;
					refreshCanvas();
				});
			}

			return input;
		}

		function createRow(layer) {
			let { immoveable, visible, src, posX, posY, originX, originY, frameNo, frameX, frameY, frameRegX, frameRegY, frameW, frameH } = layer;
			let row = table.insertRow();
			row.layer = layer;
			if (immoveable) row.classList.add("immoveable");
			createMoveWidget(row, immoveable);
			createCell(row, "visible", visible, "checkbox");
			createCell(row, "src", src, "url");
			createCell(row, "posX", posX, "number");
			createCell(row, "posY", posY, "number");
			createCell(row, "originX", originX, "number");
			createCell(row, "originY", originY, "number");
			createCell(row, "frameNo", frameNo, "number");
			createCell(row, "frameX", frameX, "number");
			createCell(row, "frameY", frameY, "number");
			createCell(row, "frameRegX", frameRegX, "number");
			createCell(row, "frameRegY", frameRegY, "number");
			createCell(row, "frameW", frameW, "number");
			createCell(row, "frameH", frameH, "number");

			(() => {

				row.addEventListener("mouseenter", e => {
					drawLayerPreview(layer);
					row.layer.previewing = true;
					layerPreviewCanvas.classList.remove("hide");
				});

				row.addEventListener("mousemove", e => {

					let width = -parseFloat(window.getComputedStyle(layerPreviewCanvas).width) * 0 + 20,
						height = -parseFloat(window.getComputedStyle(layerPreviewCanvas).height) * 3 / 4;
					//console.log(layer.src, "hmm");
					//row.style.left = e.clientX + x + 'px';
					//row.style.top = e.clientY + y + 'px';
					layerPreviewCanvas.style.left = e.pageX + width + "px";
					layerPreviewCanvas.style.top = e.pageY + height + "px";
				});
				row.addEventListener("mouseleave", e => {
					layerPreviewCanvas.classList.add("hide");
					row.layer.previewing = false;
				});

			})();

			function mouseNove(e) {
				console.log("hmm");
			}


			return row;
		}

		for (let layer of canvas.layers) {
			createRow(layer);
		}

		sortable("#layers", {
			items: ':not(.immoveable)'
		})[0].addEventListener('sortstop', function (e) {
			canvas.layers = [].map.call(table.rows, row => row.layer);
			refreshCanvas();
		});;
	}

	async function loadRoom() {
		let { value, room } = this.selectedOptions[0];
		console.log(value, room);
		canvas.room = room;
		/*{
			immovable: true,
			visible:true,
			src: "",
			posX: 0,
			posY: 0,
			originX: 0,
			originY: 0,
			frameNo: 0,
			frameX: 0,
			frameY: 0,
			frameRegX: 0,
			frameRegY: 0,
			frameW: 0,
			frameH: 0,
		}*/
		canvas.layers = [];
		if (!this.frame) this.frame = 0;
		canvas.layers.push({
			immoveable: true,
			src: "canvas",
			frameW: room.width,
			frameH: room.height,
		});


		let spriteSheet = room.spriteSheet = typeof room.spriteSheet == "string" ? await getJSON(room.spriteSheet) : room.spriteSheet,
			layout = room.layout;

		if (room.media.background)
			canvas.layers.push({
				//immoveable: true,
				visible: true,
				src: room.media.background,
				posX: 0,
				posY: 0,
				originX: 0,
				originY: 0,
				frameW: room.width,
				frameH: room.height,
			});

		/*if (spriteSheet.images) spriteSheet.images = await Promise.all(spriteSheet.images.map(async url => typeof url == "string" ? await loadImage(url) : url));*/

		audio.src = room.media.music || "";

		if (layout) {
			if (Array.isArray(layout.playground) && Array.isArray(layout.playground[0])) {
				layout.playground = [].concat.apply([], layout.playground);
			}
			layout.playground.sort((a, b) => a.y - b.y);
		}

		layout.playground.sort((a, b) => a.y - b.y);

		if (layout && spriteSheet.images) {
			for (let i in layout.playground) {
				let placement = layout.playground[i];
				if (typeof placement == "undefined") {
					console.log(`Playground ${i} has no placement`);
					continue;
				}
				let animation = spriteSheet.animations[placement.id];
				if (typeof animation == "undefined") {
					console.log(`Playground ${i},placement ${placement.id} has no animation`);
					continue;
				}

				let layer = {
					images: spriteSheet.images,
					frames: animation.frames.map(f => spriteSheet.frames[f]),
					visible: true,
					posX: placement.x,
					posY: placement.y,
					originX: placement.regX,
					originY: placement.regY,
					frameNo: 0,
				};
				updateFrameInfo(layer);
				canvas.layers.push(layer);
			}
		}



		if (room.media.foreground)
			canvas.layers.push({
				//immoveable: true,
				visible: true,
				src: room.media.foreground,
				posX: 0,
				posY: 0,
				originX: 0,
				originY: 0,
				frameW: room.width,
				frameH: room.height,
			});

		if (room.media.navMesh)
			canvas.layers.push({
				//immoveable: true,
				visible: false,
				src: room.media.navMesh,
				posX: 0,
				posY: 0,
				originX: 0,
				originY: 0,
				frameW: room.width,
				frameH: room.height,
				alpha: .5
			});

		if (room.media.treasure)
			canvas.layers.push({
				//immoveable: true,
				visible: false,
				src: room.media.treasure,
				posX: 0,
				posY: 0,
				originX: 0,
				originY: 0,
				frameW: room.width,
				frameH: room.height,
				alpha: .5
			});

		initTable();
		refreshCanvas();

	}


	async function initRoomInspector() {
		let roomSelect = document.getElementById("select-room"),
			rooms = await getManifest("rooms");

		roomSelect.addEventListener("change", loadRoom);
		for (var room of rooms) {
			room.roomId = room.roomId || room.id;
			room.name = room.name || room.roomId;
			let roomOption = document.createElement("option");
			roomOption.value = room.roomId;
			roomOption.text = room.name;
			roomOption.room = room;
			roomSelect.add(roomOption, null);
		}

		loadRoom.call(roomSelect);
	}

	setTimeout(() => { initRoomInspector(); }, 10);

})();
