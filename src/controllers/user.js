//Importar dependencias y modulos
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const mongoosePagination = require("mongoose-pagination")
const followService = require("../services/followService")


//Importar modelo
const User = require("../models/user");
const Follow = require("../models/follow");
const Publication = require("../models/publication");

//Importar servicios
const jwt = require("../services/jwt")

//Acciones de prueba
const pruebaUser = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde el controlador de user.",
        usuario: req.user
    })
}

//Registro de usuarios
const register = (req, res) => {
    //Recoger datos de la peticion
    let params = req.body;

    //Comprobar que me llegan bien
    if(!params.name || !params.surname || !params.password || !params.nick){
        // console.log("Validacion incorrecta")
        return res.status(400).json({
            status: "error",
            message: "Faltan datos por enviar"
        })
    }

    //Control de usuarios duplicados
    User.find({$or: [
        {email: params.email.toLowerCase()},
        {nick: params.nick.toLowerCase()},
    ]}).exec( async (error, users) => {
        if(error) return res.status(500).json({
            status: "error",
            message: "Error en la consulta de usuarios"
        })

        if(users && users.length >= 1){
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            })
        }

        //cifrar la contraseña
        let pwd = await bcrypt.hash(params.password, 10)
        params.password = pwd;

        //Crear objeto de usuario
        let userToSave = new User(params)

        //Guardar usuario en la base de datos
        userToSave.save((error, userStored) => {
            if(error || !userStored){
                return res.status(500).send({
                    status: "error",
                    message: "Error al almacenar usuario"
                })    
            }

        //Devolver resultado
        return res.status(200).json({
            status: "success",
            message: "Usuario registrado correctamente",
            userStored
        });

        });
    })
}

const login = (req, res) => {
    //Recoger parametros
    let params = req.body

    if(!params.email || !params.password){
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }

    //Buscar en la bd si existe el usuario
    User.findOne({email: params.email})
        // .select({"password": 0})
        .exec((error, user) => {
            if(error || !user){ return res.status(404).send({status: "error", message: "No existe el usuario"})}

            //Comprobar su contraseña
            const pwd = bcrypt.compareSync(params.password, user.password)

            if(!pwd){
                return res.status(400).send({
                    status: "error",
                    message: "No te has identificado correctamente"
                });
            }

            //conseguir token
            const token = jwt.createToken(user);


            //Devolver datos del usuario
            return res.status(200).send({
                status: "success",
                message: "Te has identificado correctamente",
                user: {
                    id: user._id,
                    name: user.name,
                    nick: user.nick
                },
                token
            });
    });
}

const profile = (req, res) => {
    //Recibir el parametro de id de usuario por url
    const id = req.params.id

    //Consulta para sacar los datos del usuario
    User.findById(id)
        .select({password:0, role: 0})
        .exec(async (error, userProfile) => {
        if(error || !userProfile){
            return res.status(404).send({
                status: "error",
                message: "El usuario no existe o hay un error"
            });
        }

        //informacion de seguimiento
        const followInfo = await followService.followThisUser(req.user.id, id);
        //Devolver el resultado 
        //posteriormete devolver informacion de follows
        return res.status(200).send({
            status: "success",
            user: userProfile,
            following: followInfo.following,
            follower: followInfo.follower
        });
    })
}

const list = (req, res) => {
    //Controlar que pagina estamos
    let page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    page = parseInt(page)
    // Consulta con moongose pagination
    let itemsPerPage = 5;

    User.find().select("-password -email -role -__v").sort('_id').paginate(page, itemsPerPage, async (error, users, total) => {
        if(error || !users){
            return res.status(404).send({
                status: "error",
                status: "No hay usuarios disponibles",
                error
            });
        }

        let followUserIds = await followService.followUserIds(req.user.id);


        //Devolver resultado
        return res.status(200).send({
            status: "success",
            users,
            page,
            itemsPerPage,
            total,
            pages: Math.ceil(total/itemsPerPage),
            user_following: followUserIds.following,
            user_follow_me: followUserIds.followers
        });
    })
}

const update = (req, res) => {
    //Recoger info del usuario a actualizar
    const userIdentity = req.user;
    let userToUpdate = req.body;

    //Eliminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;


    //Comprobar si el usuario ya existe
    User.find({$or: [
        {email: userToUpdate.email.toLowerCase()},
        {nick: userToUpdate.nick.toLowerCase()},
    ]}).exec( async (error, users) => {
        if(error) return res.status(500).json({
            status: "error",
            message: "Error en la consulta de usuarios"
        })

        let userIsset = false;
        users.forEach(user => {
            if(user && user._id != userIdentity.id) userIsset = true;
        })

        if(userIsset){
            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            })
        }

        //cifrar la contraseña
        if(userToUpdate.password){
            let pwd = await bcrypt.hash(userToUpdate.password, 10)
            userToUpdate.password = pwd;
        }else{
            delete userToUpdate.password;
        }

        //Buscar y actualizar los datos del usuario
        try {
        let userUpdated = await User.findByIdAndUpdate({_id: userIdentity.id}, userToUpdate, {new:true});
            if(!userUpdated){
                return res.status(400).send({
                    status: "error",
                    message: "Error al actualizar usuario"
                });
            }

            //Devolver respuesta
            return res.status(200).send({
                status: "success",
                message: "El usuario ha sido actualizado",
                user: userUpdated
            });
            
        } catch (error) {
            return res.status(500).send({
                status: "error",
                message: "Error al actualizar usuario"
            });
        }
    });
}

const upload = (req, res) => {

    //Recoger fichero de imagen y comprobar que existe
    if(!req.file){
        return res.status(404).send({
            status: "error",
            message: "La peticion no inlcuye la imagen"
        })
    }

    //Conseguir name del archivo
    const image = req.file.mimetype;


    //sacarar la extensioin del archivo
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
    User.findOneAndUpdate({_id: req.user.id}, {image: req.file.filename}, {new: true}, (error, userUpdated) => {
        if(error || !userUpdated){
            return res.status(500).send({
                status: "error",
                message: "Error en la subida del avatar"
            });
        }


        //Devolver respuesta
        return res.status(200).send({
            status: "success",
            user: userUpdated,
            file: req.file
        });
    })
}

const avatar = (req, res) => {
    //Sacar el parametro de la url
    const file = req.params.file

    //montar el path real de la imagen
    const filePath = "./src/uploads/avatars/"+file;

    //Comprobar que el archivo existe
    fs.stat(filePath, (error, exists) => {
        if(!exists){
            return res.status(404).send({
                status: "error", 
                message: "No existe la imagen",
                error
            });
        }

        //Devolver un file
        return res.sendFile(path.resolve(filePath))
    })
}

const counters = async (req, res) => {
    let userId = req.user.id

    if(req.params.id) userId = req.params.id

    try {
        const following = await Follow.count({"user": userId});
        const followers = await Follow.count({"followed": userId});
        const publications = await Publication.count({"user": userId});

        return res.status(200).send({
            userId,
            following,
            followers,
            publications
        })
    } catch (error) {
        return res.status(500).send({
            status: "error",
            message: "Error en los contadores",
            error
        })
    }
}

//Exportar acciones
module.exports = {
    pruebaUser,
    register,
    login,
    profile,
    list,
    update, 
    upload,
    avatar,
    counters
}
