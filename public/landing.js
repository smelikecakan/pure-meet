const createButton = document.querySelector("#create-room");
const codeCont = document.querySelector("#room-code");
const joinBut = document.querySelector("#join-room");

function uuidv4() {
  return "xxyxyxxyx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

createButton.addEventListener("click", (e) => {
  e.preventDefault();
  createButton.disabled = true;
  createButton.classList = "create-room-clicked";

  location.href = `/room?room=${uuidv4()}`;
});

joinBut.addEventListener("click", (e) => {
  e.preventDefault();
  if (codeCont.value.trim() == "") {
    codeCont.classList.add("room-code-error");
    return;
  }
  const code = codeCont.value;
  location.href = `/room?room=${code}`;
});

codeCont.addEventListener("change", (e) => {
  e.preventDefault();
  if (codeCont.value.trim() !== "") {
    codeCont.classList.remove("room-code-error");
    return;
  }
});
