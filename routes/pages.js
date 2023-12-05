const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");

router.get(["/", "/home"], (req, res) => {
  res.render("home");
});

router.get(["/login"], (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/index", (req, res) => {
  res.render("index");
});

router.get("/room", (req, res) => {
  res.render("room");
});

router.get("/record", (req, res) => {
  res.render("record");
});

router.get("/profil", userController.isLoggedIn, (req, res) => {
  //console.log(req.name);
  if (req.user) {
    res.render("profil", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

router.get("/meeting", userController.isLoggedIn, (req, res) => {
  //console.log(req.name);
  if (req.user) {
    res.render("meeting", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

module.exports = router;
