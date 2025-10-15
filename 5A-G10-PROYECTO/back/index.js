
//ES EL INDEX DEL PROYECTO ANTERIOR PERO LO VOY A USAR DE BASE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const session = require('express-session');	
var express = require('express'); //Tipo de servidor: Express
var bodyParser = require('body-parser'); //Convierte los JSON
var cors = require('cors');
const { realizarQuery } = require('./modulos/mysql');

var app = express(); //Inicializo express
var port = process.env.PORT || 4001; //Ejecuto el servidor en el puerto 3000

// Convierte una petición recibida (POST-GET...) a objeto JSON
app.use(express.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(cors());



app.get('/', function(req, res){
    res.status(200).send({
        message: 'GET Home route working fine!'
    });
});




const server = app.listen(port, () => {
	console.log(`Servidor NodeJS corriendo en http://localhost:${port}/`);
});;

const io = require('socket.io')(server, {
	cors: {
		// IMPORTANTE: REVISAR PUERTO DEL FRONTEND
		origin: ["http://localhost:3000", "http://localhost:3001"], // Permitir el origen localhost:3000
		methods: ["GET", "POST", "PUT", "DELETE"],  	// Métodos permitidos
		credentials: true                           	// Habilitar el envío de cookies
	}
});

const sessionMiddleware = session({
	//Elegir tu propia key secreta
	secret: "supersarasa",
	resave: false,
	saveUninitialized: false
});

app.use(sessionMiddleware);

io.use((socket, next) => {
	sessionMiddleware(socket.request, {}, next);
});

/*
	A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
	A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
	A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
*/

io.on("connection", (socket) => {
	const req = socket.request;

	socket.on('joinRoom', data => {
		console.log("🚀 ~ io.on ~ req.session.room:", req.session.room)
		if (req.session.room != undefined && req.session.room.length > 0)
			socket.leave(req.session.room);
            req.session.room = data.room;
            socket.join(req.session.room);

		io.to(req.session.room).emit('chat-messages', { user: req.session.user, room: req.session.room });
	});

	socket.on('pingAll', data => {
		console.log("PING ALL: ", data);
		io.emit('pingAll', { event: "Ping to all", message: data });
	});

	socket.on('sendMessage', data => {
		io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
	});

	socket.on('disconnect', () => {
		console.log("Disconnect");
	})
});




//pedidos del ahorcado!!!!!!!!!!!!!!!!!!!!!!!!!

//get palabras aleatorias
app.get('/PalabraAleatoria', async function(req, res){
   try {
     let respuesta;
     if (req.query.palabra != undefined) {
         respuesta =  await realizarQuery(`SELECT palabra FROM Palabras ORDER BY RAND() LIMIT 1`);
     } else {
         respuesta = await realizarQuery(`SELECT palabra FROM Palabras ORDER BY RAND() LIMIT 1`);
     } 
     if (respuesta.length > 0) {
         res.send({ palabra: respuesta[0].palabra })
    }
    else{
         res.send({ res: "Palabra no encontrada" })
    }
   } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)
        
   }
});




//funcion para ranking
app.put('/ActualizarEstadisticas', async function (req, res) {
    const { nombre_usuario, resultado, puntos } = req.body;
    console.log("Me llego: ")
    console.log(req.body)
    if (!nombre_usuario || !resultado) {
        return res.status(400).send({ res: "Faltan datos" });
    }
    try {
        let query = ""
        if (resultado == "ganada") {
            let datos = await realizarQuery(`SELECT partidas_ganadas, partidas_jugadas, puntos FROM Jugadores WHERE nombre_usuario = "${nombre_usuario}"`)
            let {partidas_ganadas , partidas_jugadas } = datos[0]
            console.log({partidas_ganadas , partidas_jugadas})
            query = `UPDATE Jugadores SET partidas_jugadas = ${partidas_jugadas + 1}, partidas_ganadas = ${partidas_ganadas + 1}, puntos = ${puntos + datos[0].puntos} WHERE nombre_usuario = "${nombre_usuario}"`;
        } else {
            let datos = await realizarQuery(`SELECT partidas_perdidas, partidas_jugadas, puntos FROM Jugadores WHERE nombre_usuario = "${nombre_usuario}"`)
            let {partidas_jugadas , partidas_perdidas } = datos[0]
            console.log({partidas_jugadas , partidas_perdidas})
            query = `UPDATE Jugadores SET partidas_jugadas = ${partidas_jugadas + 1}, partidas_perdidas = ${partidas_perdidas + 1}, puntos = ${puntos + datos[0].puntos} WHERE nombre_usuario = "${nombre_usuario}"`;
        }
        
        await realizarQuery(query);
        res.send({ res: "Estadísticas actualizadas correctamente" });
    } catch (e) {
        console.error("Error al actualizar estadísticas:", e);
        res.status(500).send({ res: "Error interno" });
    }
});

app.delete('/BorrarPalabra', async function (req, res) {
    let palabra = req.body.palabra;

    if (!palabra) {
        return res.send({ res: "Falta ingresar una palabra", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Palabras WHERE palabra="${req.body.palabra}"`);

        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Palabras WHERE palabra ="${req.body.palabra}"`);
            res.send({ res: "Palabra eliminada", borrada: true });
        } else {
            res.send({ res: "La palabra no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar palabra:", error);
        res.status(500).send({ res: "Error interno", borrada: false });
    }
});


//para administradores, borrar jugador
app.delete('/BorrarJugador', async function (req, res) {
    let mail = req.body.mail;

    if (!mail) {
        return res.send({ res: "Falta ingresar un mail de jugador", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.body.mail}"`);
        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Jugadores WHERE mail="${req.body.mail}"`);
            res.send({ res: "Jugador eliminado", borrada: true });
        } else {
            res.send({ res: "El jugador no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar jugador:", error);
        res.status(500).send({ res: "Error interno", borrada: false });
    }
});


//para administradores, borrrar categoria

app.delete('/EliminarCategoria', async function (req, res) {
    let nombre = req.body.nombre;

    if (!nombre) {
        return res.send({ res: "Falta ingresar una categoria", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Categorias WHERE nombre="${req.body.nombre}"`);
        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Categorias WHERE nombre="${req.body.nombre}"`);
            res.send({ res: "Categoria eliminada", borrada: true });
        } else {
            res.send({ res: "La categoria no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar la categoria:", error);
        res.status(500).send({ res: "Error interno", borrada: false });
    }
});


//para administradores, agregar palabra y en que categoria va








//get usuarios
app.get('/Jugadores', async function(req, res){
   try {
     let respuesta;
     if (req.query.mail != undefined) {
         respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.query.mail}" `)
     } else {
         respuesta = await realizarQuery("SELECT * FROM Jugadores");
     }
     res.status(200).json({
         message: 'Aca estan los jugadores',
         jugadores: respuesta
    });
   } catch (e) {
        console.log(e);
        res.json("Hubo un error, " + e)
        
   }
});


//get amistades
app.get('/Amigos', async function(req, res){
    console.log(req.query)
    try {
        let amigos = []
        if (req.query.idjugador != undefined) {
            const amistades = await realizarQuery(`SELECT idamigo FROM Amigos WHERE idjugador = ${req.query.idjugador}`)
            
            for (let i = 0; i < amistades.length; i++) {
                const datosAmigo = await realizarQuery(`SELECT * FROM Jugadores WHERE idusuario = ${amistades[i].idamigo}`)
                amigos.push(datosAmigo[0])
            }
            
            if(amigos.length > 0){
                res.status(200).json({
                    message: 'Aquí están los amigos',
                    amigos: amigos
                })
            } else {
                res.status(200).json({
                    message: 'Este jugador no tiene amigos'
                })
            }
        } else {
            const todasAmistades = await realizarQuery("SELECT * FROM Amigos")
            res.status(200).json({
                message: 'Aquí están todas las amistades',
                amistades: todasAmistades
            })
        }
    } catch (e) {
        console.log(e)
        res.json("Hubo un error: " + e)
    }
})






//get mensajes del chat

app.get('/MensajesChat', async function(req, res) {
    const { id_chat, id_usuario } = req.query;
    if (!id_chat || !id_usuario) {
        return res.status(400).json({ error: "Faltan parámetros" });
    }
    console.log("id_chat:", id_chat, "id_usuario:", id_usuario);
    try {
        //Me traigo los id_chats donde este uno u otro usuario 
        /*
        let respuesta = await realizarQuery(`SELECT * FROM UsuariosPorChat WHERE id_usuario = ${idLogged} OR id_usuario = ${id_usuario}`);
        if (respuesta.length === 0) {
            return res.status(404).json({ error: "No se encontraron chats para los usuarios proporcionados" });
        }
        // Verifica que el usuario esté en el chat
        console.log("respuesta:", respuesta);
        let id_chat_logged = [];
        let id_chat = -1;
        for (let i = 0; i < respuesta.length; i++) {
            const element = respuesta[i];
            if (element.id_usuario == idLogged) {
                id_chat_logged.push(element.id_chat);
            }
        }
        for (let i = 0; i < respuesta.length; i++) {
            const element = respuesta[i];
            for (let l = 0; l < id_chat_logged.length; l++) {
                if (element.id_chat == id_chat_logged[l]) {
                    id_chat = element.id_chat;
                }     
            }
            
        }
        */
        if (id_chat === -1) {
            return res.status(403).json({ error: "El usuario no pertenece a este chat" });
        }
        console.log("id_chat encontrado:", id_chat);
        // Trae los mensajes del chat
        /*const mensajes = await realizarQuery(`
            SELECT Mensajes.id_mensaje, Mensajes.mensaje, Mensajes.hora_de_envio, Usuarios.nombre, Usuarios.id_usuario, Chats.id_chat FROM Mensajes INNER JOIN Chats ON Mensajes.id_chat = Chats.id_chat 
            INNER JOIN UsuariosPorChat ON Chats.id_chat = UsuariosPorChat.id_chat INNER JOIN Usuarios ON UsuariosPorChat.id_usuario = Usuarios.id_usuario
            WHERE Mensajes.id_chat = "${id_chat}" ORDER BY Mensajes.hora_de_envio ASC
        `);*/
        
            const mensajes = await realizarQuery(`
                SELECT Mensajes.id_mensaje, Mensajes.mensaje, Mensajes.hora_de_envio, Usuarios.nombre, Usuarios.id_usuario
                FROM Mensajes
                INNER JOIN Usuarios ON Mensajes.id_usuario = Usuarios.id_usuario
                WHERE Mensajes.id_chat = "${id_chat}"
                ORDER BY Mensajes.hora_de_envio ASC
            `);

        res.send({ mensajes: mensajes });
    } catch (error) {
        console.error("Error en /MensajesChat:", error);
        res.status(500).json({ error: "Error interno al obtener mensajes" });
    }
});




//get chats
app.get('/Chats', async function(req, res){
   try {
     let respuesta;
     if (req.query.id_chat != undefined) {
         respuesta = await realizarQuery(`SELECT * FROM Chats WHERE id_chat=${req.query.id_chat}`)
     } else {
         respuesta = await realizarQuery("SELECT * FROM Chats");
     }
     res.status(200).send({
         message: 'Aca estan los chats',
         chats: respuesta
    });
   } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)
        
   }
});



//get mensajes
app.get('/Mensajes', async function(req, res){
   try {
     let respuesta;
     if (req.query.id_mensaje != undefined) {
         respuesta = await realizarQuery(`SELECT * FROM Mensajes WHERE id_mensaje=${req.query.id_mensaje}`)
     } else {
         respuesta = await realizarQuery("SELECT * FROM Mensajes");
     }
     res.status(200).send({
         message: 'Aca estan los mensajes',
         mensajes: respuesta
    });
   } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)
        
   }
});

//PEDIR AYUDA A RIVAS PARA HACER EL PEDIDO
app.get('/MensajesChats', async function (req,res){
    console.log(req.query)
    const mensajes = await realizarQuery(` SELECT DISTINCT id_chat FROM UsuariosPorChat WHERE id_usuario =  ${req.body.idLogged};`)
    let contactos = []
    for (let i = 0; i < chats.length; i++) {
        const auxiliar = await realizarQuery(` SELECT DISTINCT Usuarios.nombre, Usuarios.id_usuario, Chats.es_grupo, Chats.nombre_grupo FROM Usuarios
        INNER JOIN UsuariosPorChat ON Usuarios.id_usuario = UsuariosPorChat.id_usuario
        INNER JOIN Chats ON Chats.id_chat = UsuariosPorChat.id_chat
         WHERE UsuariosPorChat.id_chat = ${chats[i].id_chat};`)
        contactos.push(auxiliar)
    }
    console.log(contactos)
    if(chats.length > 0){
        res.send({contactos})
    }else{
        res.send({res: "no tiene contactos"})
    }
     
})




//get user_chat
app.get('/User_chat', async function(req, res){
   try {
     let respuesta;
     if (req.query.id_userchat != undefined) {
         respuesta = await realizarQuery(`SELECT * FROM User_chat WHERE id_userchat=${req.query.id_userchat}`)
     } else {
         respuesta = await realizarQuery("SELECT * FROM User_chat");
     }
     res.status(200).send({
         message: 'Aca estan los userChat',
         user_chat: respuesta
    });
   } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)
        
   }
});

//delete usuarios
app.delete('/BorrarUsuarios', async function (req, res) {
    let num_telefono = req.body.num_telefono;

    if (!num_telefono) {
        return res.json({ res: "Falta ingresar un numero de telefono", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Usuarios WHERE num_telefono="${req.body.num_telefono}"`);

        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Usuarios WHERE num_telefono="${req.body.num_telefono}"`);
            res.json({ res: "Usuario eliminado", borrada: true });
        } else {
            res.json({ res: "El usuario no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar usuario:", error);
        res.status(500).json({ res: "Error interno", borrada: false });
    }
});

//delete chats
app.delete('/BorrarChat', async function (req, res) {
    let id_chat = req.body.id_chat;

    if (!id_chat) {
        return res.json({ res: "Falta ingresar un id de chat", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Chats WHERE id_chat="${req.body.id_chat}"`);

        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Chats WHERE id_chat="${req.body.id_chat}"`);
            res.json({ res: "Chat eliminado", borrada: true });
        } else {
            res.json({ res: "El chat no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar chat:", error);
        res.status(500).json({ res: "Error interno", borrada: false });
    }
});

//delete mensaje
app.delete('/BorrarMensaje', async function (req, res) {
    let id_mensaje = req.body.id_mensaje;

    if (!id_mensaje) {
        return res.json({ res: "Falta ingresar un id de mensaje", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT * FROM Mensajes WHERE id_mensaje=${req.body.id_mensaje}`);

        if (respuesta.length > 0) {
            await realizarQuery(`DELETE FROM Mensajes WHERE id_mensaje=${req.body.id_mensaje}`);
            res.json({ res: "Mensajes eliminado", borrada: true });
        } else {
            res.json({ res: "El mensaje no existe", borrada: false });
        }
    } catch (error) {
        console.error("Error al borrar mensaje:", error);
        res.status(500).json({ res: "Error interno", borrada: false });
    }
});

app.post('/RegistroJugadores', async function(req, res) {
  console.log("/RegistroJugadores req.body:", req.body);
  try {
    const { contraseña, nombre, mail } = req.body;

    if (!mail) {
      return res.json({ res: "Falta mail", registro: false });
    }

    let respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${mail}"`);

    if (respuesta.length !== 0) {
      return res.json({ res: "Ese mail ya existe", registro: false });
    }

    /*let usuarios = await realizarQuery(`SELECT id_usuario FROM Usuarios `);
    let id = -1
    for (let i = 0; i < usuarios.length; i++) {
        if(id < usuarios[i].id_usuario){
            id = usuarios[i].id_usuario
        }
        
    }
    id++;*/
    await realizarQuery(`
      INSERT INTO Jugadores (  contraseña, nombre, mail)
      VALUES ("${contraseña}", "${nombre}", "${mail}")
    `);

    res.json({ res: "Usuario agregado", registro: true, idLogged: idusuario });
  } catch (e) {
    console.error("Error en /RegistroUsuarios:", e);
    res.status(500).json({ res: "Error interno", registro: false });
  }
});


//agregar palabra, para administradores
app.post('/AgregarPalabra', async function(req, res) {
  console.log("/AgregarPalabra req.body:", req.body);
  try {
    const { palabra, categoria } = req.body;

    
    if (!palabra) {
      return res.json({ res: "Falta palabra", publicada: false });
    }
    if (!categoria) {
      return res.json({ res: "Falta categoría", publicada: false });
    }

    
    let categoriaExiste = await realizarQuery(`SELECT idcategoria FROM Categorias WHERE nombre="${categoria}"`);
    
    if (categoriaExiste.length === 0) {
      return res.json({ res: "Esa categoría no existe", publicada: false });
    }

    const idcategoria = categoriaExiste[0].idcategoria;

    let palabraExiste = await realizarQuery(`SELECT idpalabra FROM Palabras WHERE palabra="${palabra}"`);
    
    let idpalabra;

    if (palabraExiste.length === 0) {
      
      await realizarQuery(`INSERT INTO Palabras (palabra) VALUES ("${palabra}")`);
      
      
      let palabraInsertada = await realizarQuery(`SELECT idpalabra FROM Palabras WHERE palabra="${palabra}"`);
      idpalabra = palabraInsertada[0].idpalabra;
    } else {
      
      idpalabra = palabraExiste[0].idpalabra;
    }

    
    let relacionExiste = await realizarQuery(`
      SELECT * FROM PalabrasCategorias 
      WHERE idpalabra=${idpalabra} AND idcategoria=${idcategoria}
    `);

    if (relacionExiste.length !== 0) {
      return res.json({ res: `"${palabra}" ya está en la categoría "${categoria}"`, publicada: false });
    }

    
    await realizarQuery(`
      INSERT INTO PalabrasCategorias (idpalabra, idcategoria) 
      VALUES (${idpalabra}, ${idcategoria})
    `);

    res.json({ 
      res: `"${palabra}" agregada en la categoría "${categoria}"`, 
      publicada: true 
    });

  } catch (e) {
    console.error("Error en /AgregarPalabra:", e);
    res.status(500).json({ res: "Error interno", publicada: false });
  }
});






//login jugadores
app.post('/LoginJugadores', async function(req,res) {
    console.log(req.body) 
    let respuesta;
    if (req.body.mail != undefined) {
        respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.body.mail}"`)
        console.log(respuesta)
        if (respuesta.length > 0) {
            if (req.body.contraseña != undefined) {
                respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.body.mail}" && contraseña="${req.body.contraseña}"`)
                console.log(respuesta)
                if  (respuesta.length > 0) {
                    res.json({
                        res: "Jugador existe",
                        loguea: true,
                        idLogged: respuesta[0].idusuario,
                        admin: Boolean(respuesta[0].administrador)
})
                }
                else{
                    res.json({res:"Contraseña incorrecta",loguea:false}) 
                }
            }else{
                res.json({res:"Falta ingresar contraseña",loguea:false})                
            }
        } 
        else{
            res.json({res:"Esta mal el mail",loguea:false})
        }
    
    }else {
        res.json({res:"Falta ingresar el mail",loguea:false})

    }    

})

//post para obtener los chats de un usuario
app.post('/Chats', async function (req,res){
    console.log(req.body)
    const chats = await realizarQuery(` SELECT DISTINCT id_chat FROM UsuariosPorChat WHERE id_usuario =  ${req.body.idLogged};`)
    let contactos = []
    for (let i = 0; i < chats.length; i++) {
        const auxiliar = await realizarQuery(` SELECT DISTINCT Usuarios.nombre, Usuarios.id_usuario, Chats.es_grupo, Chats.nombre_grupo, Chats.id_chat FROM Usuarios
        INNER JOIN UsuariosPorChat ON Usuarios.id_usuario = UsuariosPorChat.id_usuario
        INNER JOIN Chats ON Chats.id_chat = UsuariosPorChat.id_chat
         WHERE UsuariosPorChat.id_chat = ${chats[i].id_chat};`)
        contactos.push(auxiliar)
    }
    console.log(contactos)
    if(chats.length > 0){
        res.send({contactos})
    }else{
        res.send({res: "no tiene contactos"})
    }
     
})


//insertar mensajes
app.post('/insertarMensaje', async (req, res) => {
    console.log(req.body);
    const fechaActual = new Date();
    const fechaString = `${fechaActual.getFullYear()}-${("0" + (fechaActual.getMonth() + 1)).slice(-2)}-${("0" + fechaActual.getDate()).slice(-2)} ${("0" + fechaActual.getHours()).slice(-2)}:${("0" + fechaActual.getMinutes()).slice(-2)}:${("0" + fechaActual.getSeconds()).slice(-2)}`;
    const chatActivo = req.body.id_chat;
    try {
        await realizarQuery(`
            INSERT INTO Mensajes (id_chat, id_usuario, mensaje, hora_de_envio)
            VALUES (${chatActivo},"${req.body.id_usuario}",  "${req.body.mensaje}", "${fechaString}");
        `);
        res.send({ res: "Mensaje agregado correctamente", validar: true });
    } catch (error) {
        console.error("Error al insertar mensaje", error);
        res.status(500).send({ res: "Error en el servidor", validar: false });
    }
});





// Agregar este endpoint DESPUÉS del POST /Chats y ANTES del POST /insertarMensaje

// POST - Crear un nuevo chat entre dos usuarios
app.post('/CrearChat', async function(req, res) {
    const { id_usuario1, id_usuario2 } = req.body;
    console.log("id_usuario1", id_usuario1)
    console.log("id_usuario2", id_usuario2)
    if (!id_usuario1 || !id_usuario2) {
        return res.status(400).json({ error: "Faltan parámetros", creado: false });
    }

    try {
        // Verificar si ya existe un chat entre estos dos usuarios
        const chatsUsuario1 = await realizarQuery(`
            SELECT id_chat FROM UsuariosPorChat WHERE id_usuario = ${id_usuario1}
        `);
        
        const chatsUsuario2 = await realizarQuery(`
            SELECT id_chat FROM UsuariosPorChat WHERE id_usuario = ${id_usuario2}
        `);

        // Buscar chat en común (solo chats privados, no grupos)
        for (let chat1 of chatsUsuario1) {
            for (let chat2 of chatsUsuario2) {
                if (chat1.id_chat === chat2.id_chat) {
                    // Verificar que no sea un grupo
                    const chatInfo = await realizarQuery(`
                        SELECT es_grupo FROM Chats WHERE id_chat = ${chat1.id_chat}
                    `);
                    
                    if (chatInfo[0].es_grupo === 0) {
                        return res.json({ 
                            message: "El chat ya existe", 
                            creado: false,
                            id_chat: chat1.id_chat 
                        });
                    }
                }
            }
        }

        // Crear nuevo chat
        const chatsExistentes = await realizarQuery(`SELECT id_chat FROM Chats`);
        let nuevoIdChat = 1;
        if (chatsExistentes.length > 0) {
            nuevoIdChat = Math.max(...chatsExistentes.map(c => c.id_chat)) + 1;
        }

        await realizarQuery(`
            INSERT INTO Chats (id_chat, es_grupo, nombre_grupo)
            VALUES (${nuevoIdChat}, 0, NULL)
        `);

        // Agregar ambos usuarios al chat
        await realizarQuery(`
            INSERT INTO UsuariosPorChat (id_chat, id_usuario)
            VALUES (${nuevoIdChat}, ${id_usuario1})
        `);
        await realizarQuery(`
            INSERT INTO UsuariosPorChat (id_chat, id_usuario)
            VALUES (${nuevoIdChat}, ${id_usuario2})
        `);

        res.json({ 
            message: "Chat creado exitosamente", 
            creado: true,
            id_chat: nuevoIdChat 
        });

    } catch (error) {
        console.error("Error al crear chat:", error);
        res.status(500).json({ error: "Error interno al crear chat", creado: false });
    }
});


app.get('/UsuariosDisponibles', async function(req, res) {
    const { idjugador } = req.query;
    
    if (!idjugador) {
        return res.status(400).json({ error: "Falta el ID del jugador" });
    }

    try {
        // Obtener todos los jugadores excepto el usuario actual
        const todosJugadores = await realizarQuery(`
            SELECT idusuario, nombre, mail 
            FROM Jugadores 
            WHERE idusuario != ${idjugador}
        `);

        // Obtener los amigos actuales
        const amigosActuales = await realizarQuery(`
            SELECT idamigo FROM Amigos WHERE idjugador = ${idjugador}
        `);

        // Filtrar usuarios que ya son amigos
        const idsAmigos = amigosActuales.map(a => a.idamigo);
        const usuariosDisponibles = todosJugadores.filter(
            jugador => !idsAmigos.includes(jugador.idusuario)
        );

        res.status(200).json({
            message: 'Usuarios disponibles',
            usuarios: usuariosDisponibles
        });
    } catch (error) {
        console.error("Error al obtener usuarios disponibles:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

// POST - Agregar un nuevo amigo
app.post('/AgregarAmigo', async function(req, res) {
    const { idjugador, idamigo } = req.body;

    if (!idjugador || !idamigo) {
        return res.status(400).json({ 
            res: "Faltan parámetros", 
            agregado: false 
        });
    }

    try {
        // Verificar que la amistad no exista ya
        const amistadExistente = await realizarQuery(`
            SELECT * FROM Amigos 
            WHERE idjugador = ${idjugador} AND idamigo = ${idamigo}
        `);

        if (amistadExistente.length > 0) {
            return res.json({ 
                res: "Ya son amigos", 
                agregado: false 
            });
        }

        // Agregar amistad (bidireccional)
        await realizarQuery(`
            INSERT INTO Amigos (idjugador, idamigo)
            VALUES (${idjugador}, ${idamigo})
        `);

        await realizarQuery(`
            INSERT INTO Amigos (idjugador, idamigo)
            VALUES (${idamigo}, ${idjugador})
        `);

        res.json({ 
            res: "Amigo agregado correctamente", 
            agregado: true 
        });
    } catch (error) {
        console.error("Error al agregar amigo:", error);
        res.status(500).json({ 
            res: "Error interno", 
            agregado: false 
        });
    }
});

app.delete('/EliminarAmigo', async function (req, res) {
    const { idjugador, idamigo } = req.body;

    if (!idjugador || !idamigo) {
        return res.send({ res: "Faltan parámetros (idjugador y idamigo)", eliminado: false });
    }

    try {
        // Verificar si existe la relación de amistad
        let respuesta = await realizarQuery(`
            SELECT * FROM Amigos 
            WHERE idjugador = ${idjugador} AND idamigo = ${idamigo}
        `);

        if (respuesta.length > 0) {
            // Eliminar la amistad (en ambas direcciones si es necesario)
            await realizarQuery(`
                DELETE FROM Amigos 
                WHERE (idjugador = ${idjugador} AND idamigo = ${idamigo})
                OR (idjugador = ${idamigo} AND idamigo = ${idjugador})
            `);
            res.send({ res: "Amigo eliminado correctamente", eliminado: true });
        } else {
            res.send({ res: "La amistad no existe", eliminado: false });
        }
    } catch (error) {
        console.error("Error al eliminar amigo:", error);
        res.status(500).send({ res: "Error interno", eliminado: false });
    }
});