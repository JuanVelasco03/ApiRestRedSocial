const express = require("express") // framewrok express
const router = express.Router(); // rutas
const followController = require("../controllers/follow"); //Controlador
const check = require("../middlewares/auth") //middleware auth

//Definir rutas
router.get("/prueba-follow", followController.pruebaFollow);
router.post("/save", check.auth, followController.save);
router.delete("/unfollow/:id", check.auth, followController.unfollow);
router.get("/following/:id?/:page?", check.auth, followController.following);
router.get("/followers/:id?/:page?", check.auth, followController.followers);


//Exportar el router

module.exports = router;



