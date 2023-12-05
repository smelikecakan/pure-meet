const mysql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;

const db = mysql.createConnection({
  connectionLimit: 100,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  //port: DB_PORT,
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).render("login", {
        msg: "lütfen email ve şifrenizi giriniz",
        msg_type: "error",
      });
    }
    db.query(
      "select * from users where email=?",
      [email],
      async (error, result) => {
        console.log(result);
        if (result.length <= 0) {
          return res.status(401).render("login", {
            msg: "bu email ile kayıtlı kullanıcı yok",
            msg_type: "error",
          });
        } else {
          if (!(await bcrypt.compare(password, result[0].password))) {
            return res.status(401).render("login", {
              msg: "yanlış şifre",
              msg_type: "error",
            });
          } else {
            const id = result[0].userId;
            const token = jwt.sign({ userId: id }, process.env.JWT_SECRET, {
              expiresIn: process.env.JWT_EXPIRES_IN,
            });
            console.log("the token is " + token);
            const cookieOptions = {
              expires: new Date(
                Date.now() +
                  process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
              ),
              httpOnly: true,
            };
            res.cookie("melike", token, cookieOptions);
            res.status(200).redirect("/meeting");
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};
exports.register = (req, res) => {
  //res.send("form gönderildi");
  console.log(req.body);
  const { name, email, password, confirm_password } = req.body;

  db.query(
    "select email from users where email=?",
    [email],
    async (error, result) => {
      if (error) {
        confirm.log(error);
      }
      if (result.length > 0) {
        return res.render("register", {
          msg: "girilen email başka bir kullanıcıya ait",
          msg_type: "error",
        });
      } else if (password !== confirm_password) {
        return res.render("register", {
          msg: "şifreler eşleşmiyor",
          msg_type: "error",
        });
      }
      let hashedPassword = await bcrypt.hash(password, 8);
      //console.log(hashedPassword);

      db.query(
        "insert into users set ?",
        { name: name, email: email, password: hashedPassword },
        (error, result) => {
          if (error) {
            console.log(error);
          } else {
            console.log(result);
            return res.render("register", {
              msg: "kayıt başarılı",
              msg_type: "good",
            });
          }
        }
      );
    }
  );
};

exports.isLoggedIn = async (req, res, next) => {
  req.name = "check login...";
  console.log(req.cookies);
  if (req.cookies.melike) {
    try {
      const decode = await promisify(jwt.verify)(
        req.cookie.melike,
        process.env.JWT_SECRET
      );
      // console.log(decode);
      db.query(
        "select * from users where userId=?",
        [decode.userId],
        (err, results) => {
          //console.log(results);
          if (!results) {
            return next();
          }
          req.user = results[0];
          return next();
        }
      );
    } catch (error) {
      console.log(error);
      return next();
    }
  } else {
    next();
  }
};
exports.logout = async (req, res) => {
  res.cookie("melike", "logout", {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
  });
  res.status(200).redirect("/");
};
