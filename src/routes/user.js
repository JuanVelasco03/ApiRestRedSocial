const express = require("express") // framewrok express
const router = express.Router(); // rutas
const userController = require("../controllers/user"); //Controlador
const check = require("../middlewares/auth")
const multer = require("multer")

//Configuracion de subida
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./src/uploads/avatars")
    },
    filename: (req, file, cb) => {
        cb(null, "avatar-"+Date.now()+"-"+file.originalname)
    }
})

const uploads = multer({storage});

//Definir rutas
router.get("/prueba-usuario", check.auth, userController.pruebaUser);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/profile/:id", check.auth, userController.profile);
router.get("/list/:page?", check.auth, userController.list);
router.put("/update", check.auth, userController.update);
router.post("/upload", [check.auth, uploads.single("file0")], userController.upload);
router.get("/avatar/:file", userController.avatar);
router.get("/counters/:id?", check.auth, userController.counters);

//Exportar el router
module.exports = router



