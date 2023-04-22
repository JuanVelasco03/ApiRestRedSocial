//Importar modelo
const follow = require("../models/follow")
const Follow = require("../models/follow")
const User = require("../models/user")
const followService = require("../services/followService")

//Importar dependencias
const mongoosePaginate = require("mongoose-pagination");

//Acciones de prueba
const pruebaFollow = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde el controlador de Follow."
    })
}

//Accion de seguir
const save = (req, res) => {
    //Conseguir datos por el body
    const params = req.body

    //sacar id del usuario identificado 
    const identity = req.user;

    //Crear objeto con modelo follow
    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    });

    //Guardar objeto en bd
    userToFollow.save((error, followStored) => {
        if(error || !followStored){
            return res.status(500).send({
                status: "error",
                message: "No se ha poduido seguir al usuario"
            });
        }

        return res.status(200).send({
            message: "success",
            identity,
            follow: followStored
        })
    })
}

//Accion de borrar follow (Dejar de seguir)

const unfollow = (req, res) => {
    //Recoger el id del usuario identificado
    const userId = req.user.id

    //Recoger el id del ususario que quiero dejar de seguir
    const followedId = req.params.id

    //find de las coincidenciasy hacer remove
    Follow.find({
        "user": userId,
        "followed": followedId
    }).remove((error, followDeleted) => {
        if(error || !followDeleted){
            return res.status(200).send({
                status: "error",
                message: "No has dejado de seguir a nadie"
            })
        }
        return res.status(200).send({
            status: "success",
            message: "Follow eliminado correctamente",
        })
    })
}

//Accion de listado de usuarios que cualquier usuario que esta siguiendo (siguiendo)
const following = (req, res) => {
    //Sacar el id del usuario identificado
    let userId = req.user.id 

    //Comprobar si me llega el id por parametro de la url
    if(req.params.id) userId = req.params.id;

    //Comprobar si me llega la pagina, sino es la 1
    let page = 1;
    if(req.params.page) page = req.params.page;

    //Usuarios por pagina a mostrar
    const itemsPerPage = 5;

    //find a follow, popular los datos de los usuarios y paginar con mongoose.
    Follow.find({user: userId})
            .populate("user followed", "-password -role -__v -email")
            .paginate(page, itemsPerPage, async(error, follows, total) => {
                //sacar un array de l ids de los usuarios que me siguen y los que sigo como usuario identioficado
                let followUserIds = await followService.followUserIds(req.user.id)

                return res.status(200).send({
                    status: "success",
                    message: "Listado de usuarios que estoy siguiendo",
                    follows,
                    total,
                    pages: Math.ceil(total/itemsPerPage),
                    user_following: followUserIds.following,
                    user_follow_me: followUserIds.followers
                    });
                })
}

//Accion de listado de usuarios que siguen a cualquier otro usuario
const followers = (req, res) => {
    //Sacar el id del usuario identificado
    let userId = req.user.id 

    //Comprobar si me llega el id por parametro de la url
    if(req.params.id) userId = req.params.id;

    //Comprobar si me llega la pagina, sino es la 1
    let page = 1;
    if(req.params.page) page = req.params.page;

    //Usuarios por pagina a mostrar
    const itemsPerPage = 5;

    //find a follow, popular los datos de los usuarios y paginar con mongoose.
    Follow.find({followed: userId})
    .populate("user", "-password -role -__v -email")
    .paginate(page, itemsPerPage, async(error, follows, total) => {
        //sacar un array de l ids de los usuarios que me siguen y los que sigo como usuario identioficado
        let followUserIds = await followService.followUserIds(req.user.id)
        return res.status(200).send({
            status: "success",
            message: "Listado de usuarios que me siguen",
            follows,
            total,
            pages: Math.ceil(total/itemsPerPage),
            user_following: followUserIds.following,
            user_follow_me: followUserIds.followers
            });
        });
}

//Exportar acciones
module.exports = {
    pruebaFollow,
    save,
    unfollow,
    following,
    followers
}
