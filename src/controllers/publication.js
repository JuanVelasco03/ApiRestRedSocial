//importar modulos
const fs = require("fs")
const path = require("path")

//importar modelos
const Publication = require("../models/publication")

//Importar servicios
const followService = require("../services/followService")

//Acciones de prueba
const pruebaPublication = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde el controlador de Publication."
    })
}

//Guardar publicacion
const save = (req, res) => {
    //Recoger datos del body
    const params = req.body;
    //Si no me llegan dar respuesta negativa
    if(!params.text) return res.status(400).send({status:"error", message: "Debes enviar el texto de la publicacion"})
    //Crear y rellenar el objeto
    let newPublication = new Publication(params);

    newPublication.user = req.user.id;

    //guardar objeto en bd
    newPublication.save((error, publicationStored) => {
        if(error || !publicationStored){
            return res.status(404).send({
                status:"error",
                message: "No se ha guardado la publicacion"
            });
        }
        return res.status(200).send({
        status:"success",
        message: "Publicacion guardada",
        publicationStored
        })
    })
}

//Sacar una publicacion en concreto
const detail = (req, res) => {
    //Sacar id de publicacion
    const publicationId = req.params.id;
    //Find con la coindicion del id
    Publication.findById(publicationId, (error, publicationStored) => {
        if(error || !publicationStored){
            return res.status(404).send({
                status:"error",
                message: "No existe la publicacion"
            })
        }

        //devolver respuesta
        return res.status(200).send({
            status:"success",
            publicationStored
        })
    })
}

//Eliminar publicaciones
const remove = (req, res) => {
    //Sacra el id de publicacion a eliminar
    let publicationId = req.params.id;
    //Find y luego remove
    Publication.find({"user": req.user.id, "_id":publicationId}).remove(error => {
        if(error){
            return res.status(500).send({
                status:"error",
                message: "No se ha eliminado la publicacion"
            })
        }
        //devolver respuesta
        return res.status(200).send({
            status:"success",
            message: "Publicacion eliminada",
            publicationId
        })
    })
}


//Listar publicacion de un usuario
const user = (req, res) => {
    //Sacar id de usuario
    const userId = req.params.id;

    //Controlar pagina
    let page = 1;

    if(req.params.page) page = parseInt(req.params.page)

    const itemsPerPage = 5;

    //find, populate, ordenar y paginar
    Publication.find({"user": userId})
    .sort("-created_at")
    .populate("user", "-password -__v -role -email")
    .paginate(page, itemsPerPage, (error, publications, total) => {
        if(error || publications.length <= 0){
            return res.status(404).send({
                status:"error",
                message: "No hay publicaciones para mostrar"
            });
        }

        //Devolver usuario
        return res.status(200).send({
            status:"success",
            message: "publicaciones de un perfil de un usuario",
            publications,
            page,
            pages: Math.ceil(total/itemsPerPage),
            total
        });
    })
}

//Subir ficheros
const upload = (req, res) => {
    //Sacar publicationId
    const publicationId = req.params.id;

    //Recoger fichero de imagen y comprobar que existe
    if(!req.file){
        return res.status(404).send({
            status: "error",
            message: "La peticion no inlcuye la imagen"
        })
    }

    //Conseguir name del archivo
    const image = req.file.mimetype;


    //sacarar la extension del archivo
    const  imageSplit = image.split("\/");
    const  extension = imageSplit[1];

    //Comprobar extension
    if(extension != "png" && extension != "jpg" && extension != "jpeg" && extension != "gif"){
        //Borrar archivo subido
        const filePath = req.file.path

        //si no es correcta, borrar archivo
        const fileDeleted = fs.unlinkSync(filePath);

        return res.status(400).send({
            status: "error",
            message: "Extension del fichero invalida",
            extArchivo: extension
        })
    }

    //si si es correcta, guardar imagen en la base de datos
    Publication.findOneAndUpdate({"user": req.user.id, "_id": publicationId}, {file: req.file.filename}, {new: true}, (error, publicationUpdated) => {
        if(error || !publicationUpdated){
            return res.status(500).send({
                status: "error",
                message: "Error en la subida del avatar"
            });
        }


        //Devolver respuesta
        return res.status(200).send({
            status: "success",
            publication: publicationUpdated,
            file: req.file
        });
    });
}

//devolver archivos multimedia
const media = (req, res) => {
    //Sacar el parametro de la url
    const file = req.params.file

    //montar el path real de la imagen
    const filePath = "./src/uploads/publications/"+file;

    //Comprobar que el archivo existe
    fs.stat(filePath, (error, exists) => {
        if(!exists){
            return res.status(404).send({
                status: "error", 
                message: "No existe la imagen"
            });
        }
        //Devolver un file
        return res.sendFile(path.resolve(filePath))
    })
}

//Listar todas las publicaciones (feed)
const feed = async(req, res) => {
    //Sacar pagina actual
    let page = 1;

    if(req.params.page) page = parseInt(req.params.page)

    //Establecer numero de elementos por pagina
    let itemsPerPage = 5;
    //Sacar un array de identificadores de usuarios que yo sigo como usuario identificado
    try {
        const myFollows = await followService.followUserIds(req.user.id);

        //find a publicaciones pero usando in, ordenar, popular y paginar
        Publication.find({user: myFollows.following // user: {"$in": myFollows.following}
        }).populate("user", "-password -role -__v -email")
        .sort("-created_at")
        .paginate(page, itemsPerPage, (error, publications, total) => {

            if(error || !publications || publications.length <= 0){
                return res.status(500).send({
                    status: "error", 
                    message: "No hay publicaciones para mostrar"
                });
            }

            return res.status(200).send({
                status: "success", 
                message: "feed",
                total,
                page,
                pages: Math.ceil(total/itemsPerPage),
                publications
            });
        })
    } catch (error) {
        return res.status(500).send({
            status: "error", 
            message: "No se han listado las publicaciones del feed"
        });
    }
}

//Exportar acciones

module.exports = {
    pruebaPublication,
    save,
    detail,
    remove,
    user,
    upload, 
    media,
    feed
}
