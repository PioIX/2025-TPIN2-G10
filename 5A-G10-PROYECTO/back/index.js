
//ES EL INDEX DEL PROYECTO ANTERIOR PERO LO VOY A USAR DE BASE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const session = require('express-session');
var express = require('express'); //Tipo de servidor: Express
const usuariosConectados = new Map();
var bodyParser = require('body-parser'); //Convierte los JSON
var cors = require('cors');
const { realizarQuery } = require('./modulos/mysql');

var app = express(); //Inicializo express
var port = process.env.PORT || 4001; //Ejecuto el servidor en el puerto 3000

// Convierte una petición recibida (POST-GET...) a objeto JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());



app.get('/', function (req, res) {
    res.status(200).send({
        message: 'GET Home route working fine!'
    });
});




const server = app.listen(port, () => {
    console.log(`Servidor NodeJS corriendo en http://localhost:${port}/`);
});;

const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

const sessionMiddleware = session({
    secret: "supersarasa",
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// ALMACENAMIENTO DE PARTIDAS ACTIVAS
const partidasActivas = new Map();
const rooms = {};

io.on("connection", (socket) => {
    const req = socket.request;
    socket.on('registerUser', (userId) => {
        socket.userId = userId;
        usuariosConectados.set(userId.toString(), socket.id);
        console.log('usuarios conectados:', Array.from(usuariosConectados.keys()));
        socket.emit('registrationConfirmed', { userId, socketId: socket.id });
    });
    function generarLetraAleatoria() {
        const letrasDisponibles = "ABCDEFGHIJLMNOPQRSTUVZ";
        return letrasDisponibles[Math.floor(Math.random() * letrasDisponibles.length)];
    }

    // SOLICITUD DE AMISTAD
    socket.on('sendFriendRequest', async (data) => {
        const { idSolicitante, nombreSolicitante, idReceptor } = data;
        console.log(`Solicitud de amistad de ${nombreSolicitante} (${idSolicitante}) para usuario ${idReceptor}`);
        const receptorSocketId = usuariosConectados.get(idReceptor.toString());

        if (receptorSocketId) {
            const receptorSocket = io.sockets.sockets.get(receptorSocketId);

            if (receptorSocket) {
                receptorSocket.emit('friendRequestReceived', {
                    idSolicitante,
                    nombreSolicitante
                });
                socket.emit('friendRequestSent', {
                    message: 'Solicitud de amistad enviada'
                });
            }
        } else {
            socket.emit('userOffline', {
                message: 'El usuario no está conectado'
            });
        }
    });

    // ACEPTAR SOLICITUD DE AMISTAD
    socket.on('acceptFriendRequest', async (data) => {
        const { idSolicitante, idReceptor } = data;
        console.log(`${idReceptor} aceptó la solicitud de amistad de ${idSolicitante}`);
        const solicitanteSocketId = usuariosConectados.get(idSolicitante.toString());
        
        if (solicitanteSocketId) {
            const solicitanteSocket = io.sockets.sockets.get(solicitanteSocketId);
            
            if (solicitanteSocket) {
                solicitanteSocket.emit('friendAdded', {
                    message: '¡Tu solicitud de amistad fue aceptada!',
                    shouldReload: true
                });
            }
        }
        const receptorSocketId = usuariosConectados.get(idReceptor.toString());
        if (receptorSocketId) {
            const receptorSocket = io.sockets.sockets.get(receptorSocketId);
            
            if (receptorSocket) {
                receptorSocket.emit('friendAdded', {
                    message: 'Amigo agregado correctamente',
                    shouldReload: true
                });
            }
        }
    });

    // ELIMINAR AMIGO
    socket.on('removeFriend', async (data) => {
        const { idJugador, idAmigo } = data;
        console.log(`${idJugador} elimino a ${idAmigo} de sus amigos`);
        const amigoSocketId = usuariosConectados.get(idAmigo.toString());
        
        if (amigoSocketId) {
            const amigoSocket = io.sockets.sockets.get(amigoSocketId);
            
            if (amigoSocket) {
                amigoSocket.emit('friendRemoved', {
                    message: 'Un amigo te eliminó de su lista',
                    shouldReload: true
                });
            }
        }
        const jugadorSocketId = usuariosConectados.get(idJugador.toString());
        if (jugadorSocketId) {
            const jugadorSocket = io.sockets.sockets.get(jugadorSocketId);
            
            if (jugadorSocket) {
                jugadorSocket.emit('friendRemoved', {
                    message: 'Amigo eliminado correctamente',
                    shouldReload: true
                });
            }
        }
    });

    // SOLICITUD DE JUEGO
    socket.on('sendGameRequest', (data) => {
        const { idSolicitante, nombreSolicitante, idReceptor, nombreReceptor } = data;
        console.log(`solicitud de ${nombreSolicitante} (${idSolicitante}) para ${nombreReceptor} (${idReceptor})`);
        const receptorSocketId = usuariosConectados.get(idReceptor.toString());

        if (receptorSocketId) {
            const receptorSocket = io.sockets.sockets.get(receptorSocketId);

            if (receptorSocket) {
                receptorSocket.emit('gameRequest', {
                    idSolicitante,
                    nombreSolicitante,
                    idReceptor,
                    nombreReceptor
                });
                socket.emit('requestSent', {
                    message: `solicitud enviada a ${nombreReceptor}`
                });
            } else {
                socket.emit('userOffline', {
                    message: `${nombreReceptor} no está conectado`
                });
            }
        } else {
            socket.emit('userOffline', {
                message: `${nombreReceptor} no está conectado`
            });
        }
    });

    // ACEPTAR SOLICITUD DE JUEGO
    socket.on('acceptGameRequest', async (data) => {
        const { idSolicitante, idReceptor } = data;
        console.log(`${idReceptor} aceptó la solicitud de ${idSolicitante}`);
        const room = `game-${Math.min(idSolicitante, idReceptor)}-${Math.max(idSolicitante, idReceptor)}-${Date.now()}`;
        const solicitanteSocketId = usuariosConectados.get(idSolicitante.toString());
        const receptorSocketId = usuariosConectados.get(idReceptor.toString());
        if (solicitanteSocketId && receptorSocketId) {
            const solicitanteSocket = io.sockets.sockets.get(solicitanteSocketId);
            const receptorSocket = io.sockets.sockets.get(receptorSocketId);
            if (solicitanteSocket && receptorSocket) {
                solicitanteSocket.join(room);
                receptorSocket.join(room);
                try {
                    const response = await realizarQuery(`SELECT nombre FROM Categorias ORDER BY RAND() LIMIT 6`);
                    const categorias = response || [];
                    const letra = generarLetraAleatoria();
                    partidasActivas.set(room, {
                        categorias,
                        letra,
                        jugadores: [idSolicitante, idReceptor],
                        respuestas: {},
                        respuestasValidadas: {}, 
                        iniciada: false,
                        rondaActual: 1,
                        historialRondas: [] 
                    });
                    console.log(`Juego creado en sala: ${room}`);
                    io.to(room).emit('gameStarted', {
                        room,
                        jugadores: [idSolicitante, idReceptor],
                        categorias: categorias,
                        letra: letra,
                        ronda: 1
                    });

                } catch (error) {
                    console.error('Error al obtener categorías:', error);
                }
            }
        }
    });
    socket.on('solicitarNuevaRonda', (data) => {
        const { room, userId } = data;
        const partida = partidasActivas.get(room);
        if (!partida) {
            socket.emit('error', { message: 'Partida no encontrada' });
            return;
        }
        const idOponente = partida.jugadores.find(id => id.toString() !== userId.toString());
        console.log("oponente:", idOponente);
        if (idOponente) {

            io.to(room).emit('solicitudNuevaRonda', {
                idSolicitante: userId,
                room: room
            });

            console.log(`Solicitud de nueva ronda enviada al jugador ${idOponente}`);
            io.to(room).emit('solicitudEnviada', {
                message: 'solicitud enviada, esperando respuesta',
                userId: userId
            });


        } else {
            socket.emit('userOffline', {
                message: 'El otro jugador no está conectado'
            });
        }
    });




    socket.on('acceptNuevaRonda', async (data) => {
        const { room, userId } = data;
        console.log(`Usuario ${userId} aceptó nueva ronda en sala ${room}`);

        const partida = partidasActivas.get(room);
        if (!partida) {
            socket.emit('error', { message: 'Partida no encontrada' });
            return;
        }

        try {
            const nuevaLetra = generarLetraAleatoria();
            if (!partida.historialRondas) {
                partida.historialRondas = [];
            }
            partida.historialRondas.push({
                ronda: partida.rondaActual || 1,
                letra: partida.letra,
                respuestasValidadas: { ...partida.respuestasValidadas },
                categorias: partida.categorias
            });
            partida.letra = nuevaLetra;
            partida.rondaActual = (partida.rondaActual || 1) + 1;
            partida.respuestas = {};
            partida.respuestasValidadas = {}; 
            partida.iniciada = false;

            console.log(`nueva ronda iniciada: ${partida.rondaActual}, letra: ${nuevaLetra}`);

            io.to(room).emit('nuevaRondaIniciada', {
                letra: nuevaLetra,
                ronda: partida.rondaActual,
                categorias: partida.categorias
            });

        } catch (error) {
            console.error('Error al iniciar nueva ronda:', error);
            socket.emit('error', { message: 'Error al iniciar nueva ronda' });
        }
    });

    socket.on('checkPlayers', (data => {
        const { room } = data;
        io.to(room).emit('contarJugadores', data);
    }))

    // RECHAZAR SOLICITUD DE JUEGO.
    socket.on('rejectGameRequest', (data) => {
        const { room } = data;

        const solicitanteSocketId = usuariosConectados.get(idSolicitante.toString());

        if (idSolicitante) {
            const idSolicitante = io.sockets.sockets.get(solicitanteSocketId);

            if (idSolicitante) {
                io.to(room).emit('gameRejected', {
                    message: `${nombreReceptor} rechazó tu solicitud`
                });
            }
        }
    });


    // INICIAR TIMER DE LA PARTIDA
    socket.on('startGameTimer', (data) => {
        const { room } = data;
        const partida = partidasActivas.get(room);
        if (partida && !partida.iniciada) {
            partida.iniciada = true;
            io.to(room).emit('timerStarted', { startTime: Date.now() });
        }
    });

    // ENVIAR RESPUESTA
    socket.on('sendAnswer', (data) => {
        const { room, userId, categoria, respuesta } = data;

        const partida = partidasActivas.get(room);
        if (partida) {
            if (!partida.respuestas[userId]) {
                partida.respuestas[userId] = {};
            }
            partida.respuestas[userId][categoria] = respuesta;

            // Notificar a los otros jugadores
            socket.to(room).emit('opponentAnswer', {
                userId,
                categoria,
                respuesta
            });
        }
    });

    // BASTA - Terminar el tiempo para ambos jugadores
    socket.on('basta', (data) => {
        const { room, userId } = data;
        const partida = partidasActivas.get(room);
        
        if (!partida || partida.terminada) {
            console.log("no se encontro la partida");
            return;
        }
        //emitimos tiempo terminado para q el basta funcione, osea 2x1
        io.to(room).emit('tiempoTerminado', {
            message: `${userId} dijo BASTA y termino el tiempo`,
            userId: userId
        });
    });

    function calcularPuntosMejorado(misRespuestas, respuestasOponente) {
        let puntos = 0;
        let detalles = [];
        console.log("mis respuestas", misRespuestas, "respuestas del otro", respuestasOponente);

        for (const [categoria, miRespuesta] of Object.entries(misRespuestas)) {
            if (!miRespuesta.valida || !miRespuesta.palabra) {
                detalles.push({
                    categoria,
                    puntos: 0,
                    razon: "Palabra inválida o vacía"
                });
                console.log(`  0 puntitos`);
                continue;
            }
            const respuestaOpo = respuestasOponente[categoria];
            console.log(`   Respuesta oponente: ${respuestaOpo?.palabra} (válida: ${respuestaOpo?.valida})`);

            // si solo yo tengo respuesta valida o solo yo puse algo
            if (!respuestaOpo || !respuestaOpo.valida || !respuestaOpo.palabra) {
                puntos += 20;
                detalles.push({
                    categoria,
                    puntos: 20,
                    razon: "Solo vos respondiste correctamente"
                });
                console.log(`+20 puntos, solo vos respondiste`);
            }
            //si tenemos la misma
            else if (miRespuesta.palabra.toLowerCase() === respuestaOpo.palabra.toLowerCase()) {
                puntos += 5;
                detalles.push({
                    categoria,
                    puntos: 5,
                    razon: "respuestas iguales"
                });
                console.log(`+5 puntos, respuestas iguales`);
            }
            //distintas
            else {
                puntos += 10;
                detalles.push({
                    categoria,
                    puntos: 10,
                    razon: "respuestas distintas"
                });
                console.log(`+10 puntos, respuestas distintas`);
            }
        }

        console.log(`TOTAL: ${puntos} puntos`);
        return { puntos, detalles };
    }

    socket.on('enviarRespuestasValidadas', async (data) => {
        const { room, userId, respuestasValidadas } = data;
        const partida = partidasActivas.get(room);

        if (!partida) {
            console.log("NO ENCONTRE PARTIDAAAAAAAAA EN ESTE ROOM:", room);
            console.log("   partidas activas:", Array.from(partidasActivas.keys()));
            return;
        }

        console.log(`jugadores en partida:`, partida.jugadores);

        // NO SUMAR SI YA MANDO
        if (partida.respuestasValidadas && partida.respuestasValidadas[userId]) {
            console.log(`el jugador ${userId} ya envió sus respuestas, ignorando duplicado`);
            return;
        }

        // guarda respuestas validadas del jugador
        partida.respuestasValidadas = partida.respuestasValidadas || {};
        partida.respuestasValidadas[userId] = respuestasValidadas;

        //los dos mandaron?
        const jugadoresConRespuestas = Object.keys(partida.respuestasValidadas).length;
        console.log(`jugadores con respuestas: ${jugadoresConRespuestas}/2`);
        
        if (jugadoresConRespuestas === 2) {
            console.log("calculando puntos");

            const [jugador1Id, jugador2Id] = partida.jugadores;
            const respuestas1 = partida.respuestasValidadas[jugador1Id];
            const respuestas2 = partida.respuestasValidadas[jugador2Id];

            if (!respuestas1 || !respuestas2) {
                console.error("faltan respuestas");
                return;
            }

            // calcular puntos
            const resultado1 = calcularPuntosMejorado(respuestas1, respuestas2);
            const resultado2 = calcularPuntosMejorado(respuestas2, respuestas1);

            console.log(`Puntos Jugador 1 (${jugador1Id}): ${resultado1.puntos}`);
            console.log(`Puntos Jugador 2 (${jugador2Id}): ${resultado2.puntos}`);

            // enviar a TODA LA SALA
            io.to(room).emit('resultadosRonda', {
                jugador1: {
                    userId: jugador1Id,
                    puntos: resultado1.puntos,
                    respuestas: respuestas1,
                    detalles: resultado1.detalles
                },
                jugador2: {
                    userId: jugador2Id,
                    puntos: resultado2.puntos,
                    respuestas: respuestas2,
                    detalles: resultado2.detalles
                },
                ronda: partida.rondaActual || 1,
                letra: partida.letra
            });
            // limpia respuestasValidadas
            partida.respuestasValidadas = {};
            partidasActivas.set(room, partida);
        }
    });

    socket.on('enviarRespuestasFinales', (data) => {
        const { room, userId, respuestas } = data;
        const partida = partidasActivas.get(room);
        if (!partida) return;

        // primero guardar respuestas del jugador actual
        partida.respuestas[userId] = respuestas;

        // desp identifica al otro y sus respuestas
        const idOponente = partida.jugadores.find(id => id.toString() !== userId.toString());
        const respuestasOponente = partida.respuestas[idOponente];
    
        // ultimo emitir  respuestas finales
        if (respuestasOponente) {
            io.to(socket.id).emit('respuestasFinalesOponente', { respuestas: respuestasOponente, id: idOponente });
        } 

        partidasActivas.set(room, partida); // Actualizar partida
    });
    socket.on('joinRoom', data => {
        if (req.session.room != undefined && req.session.room.length > 0)
            socket.leave(req.session.room);
        req.session.room = data.room;
        socket.join(req.session.room);
        io.to(req.session.room).emit('chat-messages', { user: req.session.user, room: req.session.room });
    });

    socket.on('pingAll', data => {
        io.emit('pingAll', { event: "Ping to all", message: data });
    });

    socket.on('sendMessage', data => {
        io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
    });

    socket.on('disconnect', () => {
        console.log("Disconnect");
        if (socket.userId) {
            usuariosConectados.delete(socket.userId.toString());
            console.log(`Usuario ${socket.userId} desconectado`);
        }
    });
});


//get palabras aleatorias
app.get('/CategoriaAleatoria', async function (req, res) {
    try {
        let respuesta;
        if (req.query.nombre != undefined) {
            respuesta = await realizarQuery(`SELECT nombre FROM Categorias ORDER BY RAND() LIMIT 6`);
        } else {
            respuesta = await realizarQuery(`SELECT nombre FROM Categorias ORDER BY RAND() LIMIT 6`);
        }
        console.log(respuesta)
        if (respuesta.length > 0) {
            res.send({ categorias: respuesta })
        }
        else {
            res.send({ res: "Categoria no encontrada" })
        }
    } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)

    }
});



//para administradores, borrar jugador
app.delete('/BorrarJugador', async function (req, res) {
    const mail = req.body.mail;

    if (!mail) {
        return res.send({ res: "Falta ingresar el mail del jugador", borrada: false });
    }

    try {
        // Buscar idusuario
        const respuesta = await realizarQuery(`SELECT idusuario FROM Jugadores WHERE mail="${mail}"`);

        if (respuesta.length === 0) {
            return res.send({ res: "El jugador no existe", borrada: false });
        }

        const idusuario = respuesta[0].idusuario;
        await realizarQuery(`DELETE FROM Amigos WHERE idamigo="${idusuario}" OR idjugador="${idusuario}"`);
        const partidas = await realizarQuery(`SELECT idpartida FROM Partidas WHERE idusuario="${idusuario}"`);
        for (let p of partidas) {
            await realizarQuery(`DELETE FROM PartidaJugador WHERE idpartida="${p.idpartida}"`);
        }
        await realizarQuery(`DELETE FROM Partidas WHERE idusuario="${idusuario}"`);
        await realizarQuery(`DELETE FROM PartidaJugador WHERE idusuario="${idusuario}"`);
        await realizarQuery(`DELETE FROM Jugadores WHERE idusuario="${idusuario}"`);

        res.send({ res: "Jugador y datos relacionados eliminados", borrada: true });

    } catch (error) {
        console.error("Error al borrar jugador:", error);
        res.status(500).send({ res: "Error interno", borrada: false });
    }
});


//para administradores, borrrar categoria, deberia funcionar

app.delete('/EliminarCategoria', async function (req, res) {
    let nombre = req.body.nombre;

    if (!nombre) {
        return res.send({ res: "Falta ingresar una categoria", borrada: false });
    }

    try {
        let respuesta = await realizarQuery(`SELECT Categorias.nombre , Palabras.categoria_nombre FROM Categorias 
            INNER JOIN Palabras ON Categorias.nombre = Palabras.categoria_nombre 
            WHERE nombre="${req.body.nombre}"`);
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
//agregar palabra, para administradores

app.post('/AgregarPalabra', async function (req, res) {
    console.log("/AgregarPalabra req.body:", req.body);

    try {
        const { palabra, categoria } = req.body;

        if (!palabra) {
            return res.json({ res: "Falta palabra", publicada: false });
        }

        if (!categoria) {
            return res.json({ res: "Falta categoría", publicada: false });
        }


        const categoriaExiste = await realizarQuery(
            `SELECT idcategoria FROM Categorias WHERE nombre = ?`,
            [categoria]
        );
        if (categoriaExiste.length === 0) {
            return res.json({ res: "Esa categoría no existe", publicada: false });
        }


        const palabraExiste = await realizarQuery(
            `SELECT idpalabra FROM Palabras WHERE palabra = ? AND categoria_nombre = ?`,
            [palabra, categoria]
        );

        if (palabraExiste.length > 0) {
            return res.json({ res: "Esa palabra ya existe en esa categoría", publicada: false });
        }

        await realizarQuery(
            `INSERT INTO Palabras (palabra, categoria_nombre) VALUES (?, ?)`,
            [palabra, categoria]
        );

        return res.json({
            res: `"${palabra}" agregada en la categoría "${categoria}"`,
            publicada: true
        });

    } catch (e) {
        console.error("Error en /AgregarPalabra:", e);
        res.status(500).json({ res: "Error interno", publicada: false });
    }
});


app.delete('/BorrarPalabra', async function (req, res) {
    console.log("/BorrarPalabra req.body:", req.body);

    try {
        const { palabra, categoria } = req.body;

        if (!palabra) {
            return res.json({ message: "Falta palabra", success: false });
        }

        if (!categoria) {
            return res.json({ message: "Falta categoría", success: false });
        }

        // Verifica si la palabra existe en la categoría especificada
        const palabraExiste = await realizarQuery(
            `SELECT idpalabra FROM Palabras WHERE palabra = ? AND categoria_nombre = ?`,
            [palabra, categoria]
        );

        if (palabraExiste.length === 0) {
            return res.json({ message: "La palabra no existe en esa categoría", success: false });
        }

        // Elimina la palabra de la base de datos
        await realizarQuery(
            `DELETE FROM Palabras WHERE palabra = ? AND categoria_nombre = ?`,
            [palabra, categoria]
        );

        return res.json({
            message: `"${palabra}" eliminada de la categoría "${categoria}"`,
            success: true
        });

    } catch (e) {
        console.error("Error en /BorrarPalabra:", e);
        res.status(500).json({ message: "Error interno", success: false });
    }
});


//login jugadores
app.post('/LoginJugadores', async function (req, res) {
    console.log(req.body)
    let respuesta;
    if (req.body.mail != undefined) {
        respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.body.mail}"`)
        console.log(respuesta)
        if (respuesta.length > 0) {
            if (req.body.contraseña != undefined) {
                respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.body.mail}" && contraseña="${req.body.contraseña}"`)
                console.log(respuesta)
                if (respuesta.length > 0) {
                    res.json({
                        res: "Jugador existe",
                        loguea: true,
                        idLogged: respuesta[0].idusuario,
                        admin: Boolean(respuesta[0].administrador)
                    })
                }
                else {
                    res.json({ res: "Contraseña incorrecta", loguea: false })
                }
            } else {
                res.json({ res: "Falta ingresar contraseña", loguea: false })
            }
        }
        else {
            res.json({ res: "Esta mal el mail", loguea: false })
        }

    } else {
        res.json({ res: "Falta ingresar el mail", loguea: false })

    }

})

//get usuarios
app.get('/Jugadores', async function (req, res) {
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
app.get('/Amigos', async function (req, res) {
    console.log(req.query)
    try {
        let amigos = []
        if (req.query.idjugador != undefined) {
            const amistades = await realizarQuery(`SELECT idamigo FROM Amigos WHERE idjugador = ${req.query.idjugador}`)

            for (let i = 0; i < amistades.length; i++) {
                const datosAmigo = await realizarQuery(`SELECT * FROM Jugadores WHERE idusuario = ${amistades[i].idamigo}`)
                amigos.push(datosAmigo[0])
            }

            if (amigos.length > 0) {
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


//registro
app.post('/RegistroJugadores', async function (req, res) {
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


app.get('/UsuariosDisponibles', async function (req, res) {
    const { idjugador } = req.query;

    if (!idjugador) {
        return res.status(400).json({ error: "Falta el ID del jugador" });
    }

    try {
        const todosJugadores = await realizarQuery(`
            SELECT idusuario, nombre, mail 
            FROM Jugadores 
            WHERE idusuario != ${idjugador}
        `);
        const amigosActuales = await realizarQuery(`
            SELECT idamigo FROM Amigos WHERE idjugador = ${idjugador}
        `);
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

//agregar un nuevo amigo
app.post('/AgregarAmigo', async function (req, res) {
    const { idjugador, idamigo } = req.body;

    if (!idjugador || !idamigo) {
        return res.status(400).json({
            res: "Faltan parámetros",
            agregado: false
        });
    }
    try {
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
        let respuesta = await realizarQuery(`
            SELECT * FROM Amigos 
            WHERE idjugador = ${idjugador} AND idamigo = ${idamigo}
        `);

        if (respuesta.length > 0) {
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

app.get('/Ranking', async function (req, res) {
    try {
        const respuesta = await realizarQuery(`
       SELECT idusuario, nombre, partidasjugadas, partidasganadas, partidasperdidas, puntos 
       FROM Jugadores 
       ORDER BY puntos DESC
     `);

        res.status(200).json({
            message: 'Ranking de jugadores',
            jugadores: respuesta
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "Hubo un error: " + e });
    }
});
app.get('/Categorias', async function (req, res) {
    try {
        let respuesta;
        if (req.query.nombre != undefined) {
            respuesta = await realizarQuery(`SELECT * FROM Categorias WHERE nombre="${req.query.nombre}"`)
        } else {
            respuesta = await realizarQuery("SELECT * FROM Categorias");
        }
        res.status(200).json({
            message: 'Aquí están las categorías',
            categorias: respuesta
        });
    } catch (e) {
        console.log(e);
        res.json("Hubo un error, " + e)
    }
});


// REEMPLAZAR el endpoint /HistorialPartidas completo en index.js:

app.get('/HistorialPartidas', async function (req, res) {
    const { idjugador } = req.query;

    if (!idjugador) {
        return res.status(400).json({ error: "Falta el ID del jugador" });
    }

    try {
        console.log(`📊 Buscando historial para jugador: ${idjugador}`);

        // Primero verificar qué columnas existen en tu tabla Partidas
        const partidas = await realizarQuery(`
            SELECT * FROM Partidas 
            WHERE idusuario = ${idjugador}
            ORDER BY fecha DESC
        `);

        console.log(`✅ Partidas encontradas: ${partidas.length}`);
        if (partidas.length > 0) {
            console.log(`📝 Columnas disponibles:`, Object.keys(partidas[0]));
        }

        if (partidas.length === 0) {
            return res.status(200).json({
                message: 'No hay partidas jugadas',
                historial: []
            });
        }

        // Obtener nombre del jugador
        const jugador = await realizarQuery(`
            SELECT nombre FROM Jugadores WHERE idusuario = ${idjugador}
        `);
        const nombreJugador = jugador[0]?.nombre || 'Jugador';

        // Obtener lista de amigos
        const amigos = await realizarQuery(`
            SELECT a.idamigo, j.nombre
            FROM Amigos a
            INNER JOIN Jugadores j ON a.idamigo = j.idusuario
            WHERE a.idjugador = ${idjugador}
        `);

        // Si no tiene amigos, usar otros jugadores
        let posiblesOponentes = amigos;
        if (amigos.length === 0) {
            posiblesOponentes = await realizarQuery(`
                SELECT idusuario as idamigo, nombre
                FROM Jugadores
                WHERE idusuario != ${idjugador}
                ORDER BY RAND()
                LIMIT 10
            `);
        }

        // Procesar historial
        const historialProcesado = partidas.map((partida, index) => {
            const oponente = posiblesOponentes.length > 0
                ? posiblesOponentes[index % posiblesOponentes.length]
                : { idamigo: -1, nombre: 'Oponente' };

            // Log para debug
            console.log(`🔍 Procesando partida ${partida.idpartida}:`, {
                empate: partida.empate,
                resultado: partida.resultado,
                puntos: partida.puntosobtenidos
            });

            // Detectar si es empate - normalizar todos los posibles valores
            const esEmpate = partida.empate == 1 || 
                           partida.empate === '1' || 
                           partida.empate === true || 
                           partida.empate === 'true' ||
                           partida.empate === 'empate';
            
            // Detectar si ganó - normalizar el campo resultado
            let gano = false;
            if (partida.resultado) {
                const resultadoNormalizado = String(partida.resultado).toLowerCase().trim();
                gano = resultadoNormalizado === 'ganada' || 
                       resultadoNormalizado === 'ganado' || 
                       resultadoNormalizado === 'victoria';
                
                console.log(`  resultado='${partida.resultado}' → normalizado='${resultadoNormalizado}' → ganó=${gano}`);
            }
            
            let nombreGanador;
            if (esEmpate) {
                nombreGanador = 'Empate';
            } else if (gano) {
                nombreGanador = nombreJugador;
            } else {
                nombreGanador = oponente.nombre;
            }

            console.log(`  ✅ Procesado: empate=${esEmpate}, ganó=${gano}, ganador=${nombreGanador}`);

            return {
                idhistorial: partida.idpartida,
                fecha: partida.fecha,
                oponente: oponente.nombre,
                idOponente: oponente.idamigo,
                empate: esEmpate,
                gano: gano,
                ganador: nombreGanador,
                puntos: partida.puntosobtenidos || 0
            };
        });

        console.log(`📤 Enviando ${historialProcesado.length} partidas procesadas`);

        res.status(200).json({
            message: 'Historial de partidas',
            historial: historialProcesado
        });

    } catch (error) {
        console.error("❌ Error al obtener historial:", error);
        res.status(500).json({ error: "Error interno: " + error.message });
    }
});

// TAMBIÉN actualizar /ActualizarEstadisticas para recibir puntosOponente:

app.put('/ActualizarEstadisticas', async function (req, res) {
  const { idGanador, puntosGanador, puntosOponente, empate } = req.body;

  try {
    if (!idGanador || idGanador.length !== 2) {
      return res.json({ 
        res: "Datos incompletos (se requieren 2 jugadores)", 
        ok: false 
      });
    }

    console.log(`📊 Actualizando stats: Ganador=${idGanador[0]}, Oponente=${idGanador[1]}, Empate=${empate}`);

    // Si es EMPATE
    if (empate === true) {
      console.log("⚖️ Registrando EMPATE");
      
      for (let i = 0; i < 2; i++) {
        const id = idGanador[i];
        
        const datos = await realizarQuery(
          `SELECT partidasjugadas, puntos FROM Jugadores WHERE idusuario = ?`,
          [id]
        );

        if (!datos || datos.length === 0) continue;

        const { partidasjugadas, puntos } = datos[0];
        
        const nuevasPartidas = partidasjugadas + 1;
        const nuevosPuntos = puntos + puntosGanador;
        
        console.log(`  Jugador ${id}: +1 partida, +${puntosGanador} puntos (EMPATE)`);

        await realizarQuery(
          `UPDATE Jugadores 
           SET partidasjugadas = ?, puntos = ? 
           WHERE idusuario = ?`,
          [nuevasPartidas, nuevosPuntos, id]
        );
      }

      return res.json({ 
        res: "Empate registrado correctamente", 
        ok: true 
      });
    }

    console.log("🏆 Registrando GANADOR y PERDEDOR");

    // GANADOR (posición 0)
    const idGanadorReal = idGanador[0];
    const datosGanador = await realizarQuery(
      `SELECT partidasjugadas, puntos, partidasganadas 
       FROM Jugadores WHERE idusuario = ?`,
      [idGanadorReal]
    );

    if (datosGanador && datosGanador.length > 0) {
      const { partidasjugadas, puntos, partidasganadas } = datosGanador[0];
      
      const nuevasPartidas = partidasjugadas + 1;
      const nuevosPuntos = puntos + puntosGanador;
      const nuevasGanadas = partidasganadas + 1;

      console.log(`✅ Ganador ${idGanadorReal}: +1 ganada, +${puntosGanador} puntos`);

      await realizarQuery(
        `UPDATE Jugadores 
         SET partidasjugadas = ?, puntos = ?, partidasganadas = ? 
         WHERE idusuario = ?`,
        [nuevasPartidas, nuevosPuntos, nuevasGanadas, idGanadorReal]
      );
    }

    // PERDEDOR (posición 1)
    const idPerdedor = idGanador[1];
    const datosPerdedor = await realizarQuery(
      `SELECT partidasjugadas, puntos, partidasperdidas 
       FROM Jugadores WHERE idusuario = ?`,
      [idPerdedor]
    );

    if (datosPerdedor && datosPerdedor.length > 0) {
      const { partidasjugadas, puntos, partidasperdidas } = datosPerdedor[0];
      
      const nuevasPartidas = partidasjugadas + 1;
      const nuevosPuntos = puntos + (puntosOponente || 0);
      const nuevasPerdidas = partidasperdidas + 1;

      console.log(`❌ Perdedor ${idPerdedor}: +1 perdida, +${puntosOponente || 0} puntos`);

      await realizarQuery(
        `UPDATE Jugadores 
         SET partidasjugadas = ?, puntos = ?, partidasperdidas = ? 
         WHERE idusuario = ?`,
        [nuevasPartidas, nuevosPuntos, nuevasPerdidas, idPerdedor]
      );
    }

    return res.json({ 
      res: "Estadísticas actualizadas correctamente", 
      ok: true 
    });

  } catch (e) {
    console.error("❌ Error al actualizar estadísticas:", e);
    res.status(500).json({ 
      res: "Error interno: " + e.message, 
      ok: false 
    });
  }
});

app.put('/ActualizarEstadisticas', async function (req, res) {
  const { idGanador, puntosGanador, puntosOponente, empate } = req.body;

  try {
    if (!idGanador || idGanador.length !== 2) {
      return res.json({ 
        res: "Datos incompletos (se requieren 2 jugadores)", 
        ok: false 
      });
    }

    console.log(`📊 Actualizando stats: Ganador=${idGanador[0]}, Oponente=${idGanador[1]}, Empate=${empate}`);

    // Si es EMPATE
    if (empate === true) {
      console.log("⚖️ Registrando EMPATE");
      
      for (let i = 0; i < 2; i++) {
        const id = idGanador[i];
        
        const datos = await realizarQuery(
          `SELECT partidasjugadas, puntos FROM Jugadores WHERE idusuario = ?`,
          [id]
        );

        if (!datos || datos.length === 0) continue;

        const { partidasjugadas, puntos } = datos[0];
        
        const nuevasPartidas = partidasjugadas + 1;
        const nuevosPuntos = puntos + puntosGanador;
        
        console.log(`  Jugador ${id}: +1 partida, +${puntosGanador} puntos (EMPATE)`);

        await realizarQuery(
          `UPDATE Jugadores 
           SET partidasjugadas = ?, puntos = ? 
           WHERE idusuario = ?`,
          [nuevasPartidas, nuevosPuntos, id]
        );
      }

      return res.json({ 
        res: "Empate registrado correctamente", 
        ok: true 
      });
    }

    console.log("🏆 Registrando GANADOR y PERDEDOR");

    // GANADOR (posición 0)
    const idGanadorReal = idGanador[0];
    const datosGanador = await realizarQuery(
      `SELECT partidasjugadas, puntos, partidasganadas 
       FROM Jugadores WHERE idusuario = ?`,
      [idGanadorReal]
    );

    if (datosGanador && datosGanador.length > 0) {
      const { partidasjugadas, puntos, partidasganadas } = datosGanador[0];
      
      const nuevasPartidas = partidasjugadas + 1;
      const nuevosPuntos = puntos + puntosGanador;
      const nuevasGanadas = partidasganadas + 1;

      console.log(`✅ Ganador ${idGanadorReal}: +1 ganada, +${puntosGanador} puntos`);

      await realizarQuery(
        `UPDATE Jugadores 
         SET partidasjugadas = ?, puntos = ?, partidasganadas = ? 
         WHERE idusuario = ?`,
        [nuevasPartidas, nuevosPuntos, nuevasGanadas, idGanadorReal]
      );
    }

    // PERDEDOR (posición 1)
    const idPerdedor = idGanador[1];
    const datosPerdedor = await realizarQuery(
      `SELECT partidasjugadas, puntos, partidasperdidas 
       FROM Jugadores WHERE idusuario = ?`,
      [idPerdedor]
    );

    if (datosPerdedor && datosPerdedor.length > 0) {
      const { partidasjugadas, puntos, partidasperdidas } = datosPerdedor[0];
      
      const nuevasPartidas = partidasjugadas + 1;
      const nuevosPuntos = puntos + (puntosOponente || 0);
      const nuevasPerdidas = partidasperdidas + 1;

      console.log(` Perdedor ${idPerdedor}: +1 perdida, +${puntosOponente || 0} puntos`);

      await realizarQuery(
        `UPDATE Jugadores 
         SET partidasjugadas = ?, puntos = ?, partidasperdidas = ? 
         WHERE idusuario = ?`,
        [nuevasPartidas, nuevosPuntos, nuevasPerdidas, idPerdedor]
      );
    }

    return res.json({ 
      res: "Estadísticas actualizadas correctamente", 
      ok: true 
    });

  } catch (e) {
    console.error(" Error al actualizar estadísticas:", e);
    res.status(500).json({ 
      res: "Error interno: " + e.message, 
      ok: false 
    });
  }
});
// También asegúrate de que el endpoint /Jugadores soporte búsqueda por idusuario:

app.get('/Jugadores', async function (req, res) {
    try {
        let respuesta;
        if (req.query.mail != undefined) {
            respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE mail="${req.query.mail}"`);
        } else if (req.query.idusuario != undefined) {
            respuesta = await realizarQuery(`SELECT * FROM Jugadores WHERE idusuario=${req.query.idusuario}`);
        } else {
            respuesta = await realizarQuery("SELECT * FROM Jugadores");
        }
        
        res.status(200).json({
            message: 'Aquí están los jugadores',
            jugadores: respuesta
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "Hubo un error: " + e });
    }
});

app.post('/GuardarPartida', async function (req, res) {
    const { idGanador, puntosGanador, empate } = req.body;

    if (!idGanador || !Array.isArray(idGanador) || idGanador.length !== 2 || empate === undefined) {
        return res.status(400).json({
            res: "Faltan parametros o formato incorrecto",
            guardado: false
        });
    }

    try {
        const fechaActual = new Date().toISOString().slice(0, 19).replace('T', ' ');

        for (let i = 0; i < idGanador.length; i++) {
            const jugadorId = idGanador[i];
            
            let puntos;
            
            if (empate === true) {
                puntos = puntosGanador;
            } else {
                if (i === 0) {
                    puntos = puntosGanador;
                } else {
                    puntos = 0;
                }
            }

            await realizarQuery(
                `INSERT INTO Partidas (idusuario, fecha, puntosobtenidos, empate) 
                 VALUES (?, ?, ?, ?)`,
                [jugadorId, fechaActual, puntos, empate ? 1 : 0]
            );
        }

        res.json({
            res: "Partida guardada correctamente para ambos jugadores",
            guardado: true
        });

    } catch (error) {
        console.error("Error al guardar partida:", error);
        res.status(500).json({
            res: "Error interno: " + error.message,
            guardado: false
        });
    }
});

app.get('/LlevoPalabras', async function (req, res) {
    try {
        let respuesta;
        if (req.query != undefined) {
            respuesta = await realizarQuery(`SELECT * FROM Palabras  `);
        } else {
            respuesta = await realizarQuery(`SELECT * FROM Palabras `);
        }
        console.log(respuesta)
        if (respuesta.length > 0) {
            res.send({ palabras: respuesta })
        }
        else {
            res.send({ res: "Palabras no encontrada" })
        }
    } catch (e) {
        console.log(e);
        res.send("Hubo un error, " + e)

    }
});
//HACER
// En index.js - REEMPLAZA el endpoint /VerificarPalabra

// Función para normalizar palabras (quitar tildes)
function normalizarPalabra(palabra) {
    return palabra
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Función para agregar tildes comunes a palabras
function generarVariantesConTildes(palabra) {
    const variantes = [palabra];
    const palabraLower = palabra.toLowerCase();
    
    // Mapeo de vocales sin tilde a con tilde
    const tildes = {
        'a': ['á'], 'e': ['é'], 'i': ['í'], 'o': ['ó'], 'u': ['ú', 'ü'],
        'n': ['ñ']
    };
    
    // Generar variantes comunes (solo las más probables)
    // Por ejemplo: pizarron -> pizarrón
    for (let i = 0; i < palabraLower.length; i++) {
        const letra = palabraLower[i];
        if (tildes[letra]) {
            tildes[letra].forEach(tilde => {
                const variante = palabraLower.substring(0, i) + tilde + palabraLower.substring(i + 1);
                variantes.push(variante);
            });
        }
    }
    
    return [...new Set(variantes)]; // Eliminar duplicados
}

async function verificarEnRAE(palabra) {
    try {
        const palabraLimpia = palabra.trim().toLowerCase();
        const variantes = generarVariantesConTildes(palabraLimpia);
        
        console.log(`🔍 Buscando palabra "${palabraLimpia}" (${variantes.length} variantes)`);
        
        // Limitar a las 3 variantes más probables para ser más rápido
        const variantesLimitadas = variantes.slice(0, 3);
        
        // Intentar con cada variante (máximo 3)
        for (const variante of variantesLimitadas) {
            // Intentar primero con rae-api.com (más rápida)
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos
                
                const url = `https://rae-api.com/api/words/${encodeURIComponent(variante)}`;
                
                const response = await fetch(url, {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.ok && data.data && data.data.meanings && data.data.meanings.length > 0) {
                        console.log(`✅ "${variante}" encontrada en rae-api.com`);
                        return {
                            existe: true,
                            fuente: "rae",
                            definicion: data.data.meanings,
                            palabra: data.data.word,
                            varianteEncontrada: variante !== palabraLimpia ? variante : null
                        };
                    }
                }
            } catch (apiError) {
                if (apiError.name === 'AbortError') {
                    console.log(`⏱️ Timeout en rae-api.com para "${variante}"`);
                }
                // Continuar con la siguiente variante
            }

            // Fallback: Usar la API oficial de la RAE
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos
                
                const urlOficial = `https://dle.rae.es/data/search?w=${encodeURIComponent(variante)}`;

                const responseOficial = await fetch(urlOficial, {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (responseOficial.ok) {
                    const data = await responseOficial.json();
                    const existe = data && data.res && data.res.length > 0;

                    if (existe) {
                        console.log(`✅ "${variante}" encontrada en API oficial RAE`);
                        return {
                            existe: true,
                            fuente: "rae",
                            definicion: "Palabra encontrada en el diccionario de la RAE",
                            palabra: variante,
                            varianteEncontrada: variante !== palabraLimpia ? variante : null
                        };
                    }
                }
            } catch (oficialError) {
                if (oficialError.name === 'AbortError') {
                    console.log(`⏱️ Timeout en API oficial RAE para "${variante}"`);
                }
                // Continuar con la siguiente variante
            }
        }

        console.log(` "${palabraLimpia}" NO encontrada`);
        return {
            existe: false,
            fuente: "rae",
            definicion: null
        };

    } catch (error) {
        console.error("Error al consultar RAE:", error);
        return { existe: false, fuente: "rae", error: true };
    }
}

app.get('/VerificarPalabra', async function (req, res) {
    try {
        const { palabra, categoria } = req.query;

        if (!palabra || !categoria) {
            return res.status(400).send({ error: "Faltan parámetros 'palabra' o 'categoria'" });
        }

        const palabraNormalizada = palabra.trim();
        const categoriaNormalizada = categoria.trim();

        // 1. Buscar en categoría específica
        const queryEspecifica = `
            SELECT * FROM Palabras 
            WHERE LOWER(palabra) = LOWER("${palabraNormalizada}") 
            AND LOWER(categoria_nombre) = LOWER("${categoriaNormalizada}")
        `;

        const resultadoEspecifico = await realizarQuery(queryEspecifica);

        if (resultadoEspecifico.length > 0) {
            return res.send({
                existe: true,
                palabra: resultadoEspecifico[0],
                fuente: "base_datos",
                mensaje: "Palabra válida en la categoría"
            });
        }

        // 2. Buscar en cualquier categoría
        const queryCualquiera = `
            SELECT * FROM Palabras 
            WHERE LOWER(palabra) = LOWER("${palabraNormalizada}")
        `;

        const resultadoCualquiera = await realizarQuery(queryCualquiera);

        if (resultadoCualquiera.length > 0) {
            return res.send({
                existe: true,
                palabra: resultadoCualquiera[0],
                fuente: "base_datos",
                mensaje: "Palabra válida (encontrada en otra categoría)"
            });
        }

        // 3. Buscar en RAE API
        const resultadoRAE = await verificarEnRAE(palabraNormalizada);

        if (resultadoRAE.existe) {
            return res.send({
                existe: true,
                fuente: "rae",
                definicion: resultadoRAE.definicion,
                mensaje: "Palabra válida según RAE API",
                palabra: resultadoRAE.palabra
            });
        }

        // 4. No existe en ningún lado
        return res.send({
            existe: false,
            fuente: "ninguna",
            mensaje: "Palabra no encontrada ni en la base de datos ni en la RAE"
        });

    } catch (e) {
        console.error("Error en /VerificarPalabra:", e);
        res.status(500).send({ error: "Hubo un error en el servidor" });
    }
});

async function verificarEnRAE2(palabra) {
    try {
        const palabraLimpia = palabra.trim().toLowerCase();

        
        const url = `https://dle.rae.es/data/search?w=${(palabraLimpia)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        if (!response.ok) {
            console.log('Error en respuesta de RAE:', response.status);
            return { existe: false, fuente: 'rae', error: true };
        }

        const data = await response.json();

        // Si la RAE devuelve resultados, la palabra existe
        const existe = data && data.res && data.res.length > 0;

        return {
            existe: existe,
            fuente: 'rae',
            definicion: existe ? 'Palabra encontrada en el diccionario de la RAE' : null
        };

    } catch (error) {
        console.error('Error al consultar RAE:', error);
        return { existe: false, fuente: 'rae', error: true };
    }
}