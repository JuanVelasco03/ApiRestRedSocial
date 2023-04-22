const express = require("express") // framewrok express
const router = express.Router(); // rutas
const publicationController = require("../controllers/publication"); //Controlador
const check = require("../middlewares/auth")
const multer = require("multer")

//Configuracion de subida
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./src/uploads/publications")
    },
    filename: (req, file, cb) => {
        cb(null, "pub-"+Date.now()+"-"+file.originalname)
    }
})

const uploads = multer({storage});

//Definir rutas
router.get("/prueba-publication", publicationController.pruebaPublication);
router.post("/save", check.auth, publicationController.save);
router.get("/detail/:id", check.auth, publicationController.detail);
router.delete("/remove/:id", check.auth, publicationController.remove);
router.get("/user/:id/:page?", check.auth, publicationController.user);
router.post("/upload/:id", [check.auth, uploads.single("file0")], publicationController.upload);
router.get("/media/:file", publicationController.media);
router.get("/feed/:page?", check.auth, publicationController.feed);



//Exportar el router
module.exports = router



