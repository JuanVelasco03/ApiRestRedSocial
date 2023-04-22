//Importar dependencias
const connection = require("./src/database/connection")
const express = require("express")
const cors = require("cors")

//Conexion base de datos
connection();

//Mensaje bienvenida
console.log("API NODE para red social arrancada!!");

//crear servidor node
const app = express();
const puerto = 3900;

//Configurar cors
app.use(cors());

//convertir los datos del body a objetos js
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//cargar rutas conf
const UserRoutes = require("./src/routes/user")
const PublicationRoutes = require("./src/routes/publication")
const FollowRoutes = require("./src/routes/follow")

app.use("/api/user", UserRoutes);
app.use("/api/publication", PublicationRoutes);
app.use("/api/follow", FollowRoutes);


//Ruta de prueba
app.get("/ruta-prueba", (req, res) => {
    return res.status(200).json(
        {
            "id": 1,
            "nombre": "Juan Velasco Yara"
        }
    )
})

//poner servidor a escuchar peticiones http
app.listen(puerto, () => {
    console.log("Servidor de node corriendo en el puerto: ", puerto)
})
