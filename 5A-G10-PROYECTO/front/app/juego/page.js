"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../components/Button";
import Input from "../components/Input";
import styles from "./page.module.css";
import { useSocket } from "../../hook/useSocket";

export default function TuttiFrutti() {
  const [letra, setLetra] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(8);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [room, setRoom] = useState("");
  const [juegoIniciado, setJuegoIniciado] = useState(false);
  const [esperandoOtroJugador, setEsperandoOtroJugador] = useState(true);
  const [estoyUnido, setEstoyUnido] = useState(false);
  const [nuevaRonda, setNuevaRonda] = useState(false);
  const [historialRondas, setHistorialRondas] = useState([]);
  const [rondaActual, setRondaActual] = useState(1);
  const [letraActual, setLetraActual] = useState("");
  const [esperandoNuevaRonda, setEsperandoNuevaRonda] = useState(false);
  const [respuestasOponente, setRespuestasOponente] = useState(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarNombreUsuario();

    const roomParam = searchParams.get('room');
    const categoriasParam = searchParams.get('categorias');
    const letraParam = searchParams.get('letra');

    if (roomParam) {
      setRoom(roomParam);
      console.log("Room cargada:", roomParam);
    }

    if (categoriasParam) {
      try {
        const categoriasArray = JSON.parse(categoriasParam);
        setCategorias(categoriasArray);
        console.log("Categorías cargadas:", categoriasArray);
      } catch (error) {
        console.error("Error al parsear categorías:", error);
      }
    }

    if (letraParam) {
      setLetra(letraParam);
      console.log("Letra cargada:", letraParam);
    }
  }, [searchParams]);

  // USE EFFECT DE EVENTOS DEL SOCKET
  useEffect(() => {
    if (!socket || !room || !isConnected) {
      console.log("Esperando conexión...", { socket: !!socket, room, isConnected });
      return;
    }

    console.log("Uniéndose a la sala:", room);
    const idLogged = localStorage.getItem("idLogged");

    socket.emit('joinRoom', {
      room,
      userId: idLogged,
      username: nombreUsuario
    });

    //esto es lo que no anda para uno de los jugadores(el que manda la solicitud)
    socket.on('timerStarted', (data) => {
      console.log("Timer iniciado:", data);
      setJuegoActivo(true);
      setJuegoIniciado(true);
      setEsperandoOtroJugador(false);
      setEstoyUnido(true);
      if (data.timeRemaining) {
        setTiempoRestante(data.timeRemaining);
      }
    });

    socket.on('timerUpdate', (data) => {
      console.log("Timer actualizado:", data.timeRemaining);
      setTiempoRestante(data.timeRemaining);
    });

    socket.on('gameEnded', (data) => {
      console.log("Juego terminado:", data);
      setJuegoActivo(false);
      if (data.respuestas) {
        setRespuestasOponente(data.respuestas);
        const puntosRonda = calcularPuntosSinModal(data.respuestas);
        guardarRondaEnHistorial(puntosRonda);
        showModal("¡BASTA!", data.message || "Un jugador dijo BASTA. Obtuviste " + puntosRonda + " puntos.");
      } else {

        showModal("¡BASTA!", data.message || "Un jugador dijo BASTA.");
      }
    });
    socket.on('respuestasFinalesOponente', (data) => {
      console.log("Respuestas finales del oponente:", data);
      if (data.id != idLogged) {//si el id de la data es desigual a mi id se pone como respuestaoponente la data del iddesigual al mio
        setRespuestasOponente(data.respuestas);

        const puntosRonda = calcularPuntosSinModal(data.respuestas);
        guardarRondaEnHistorial(puntosRonda);
        console.log("¡Ronda Finalizada!", `Obtuviste ${puntosRonda} puntos.`)
        showModal("¡Ronda Finalizada!", `Obtuviste ${puntosRonda} puntos.`);
      }
    });



    socket.on('solicitudNuevaRonda', (data) => {
      console.log(data.idSolicitante)
      if (data.idSolicitante != idLogged) {
        console.log("Solicitud de nueva ronda recibida:", data);
        setSolicitudPendiente({
          idSolicitante: data.idSolicitante,
          nombreSolicitante: data.nombreSolicitante,
          room: data.room
        });
      }
    });

    socket.on('solicitudEnviada', (data) => {
      if (data.userId == idLogged) {
        showModal("Solicitud enviada", data.message);
      }
    });

    socket.on('nuevaRondaRechazada', (data) => {
      console.log("Nueva ronda rechazada:", data);
      setEsperandoNuevaRonda(false);
      showModal("Ronda rechazada", data.message);
    });

    socket.on('nuevaRondaIniciada', (data) => {
      console.log("Nueva ronda iniciada:", data);
      closeModal();
      setLetra(data.letra);
      setRondaActual(data.ronda);
      setRespuestas({});
      setRespuestasOponente(null);
      setTiempoRestante(2);
      setEsperandoNuevaRonda(false);
      setJuegoActivo(false);


      setTimeout(() => {
        socket.emit('startGameTimer', { room });
      }, 300);
    });

    socket.on('esperandoOtroJugador', (data) => {
      console.log(data.mensaje);
      setEsperandoNuevaRonda(true);
    });
    socket.on('playerJoined', (data) => {
      console.log("Jugador unido:", data);
      if (data.playersCount >= 2) {
        setEsperandoOtroJugador(false);
        setEstoyUnido(true);
      }
    });

    socket.on('contarJugadores', (data) => {
      console.log("Contar jugadores:", data)
      if (data.userId !== idLogged) {
        setEsperandoOtroJugador(false);
        setEstoyUnido(true);
        socket.emit('startGameTimer', { room });
      }
      ;
    });

    socket.on('error', (error) => {
      console.error("Error del socket:", error);
      showModal("Error", error.message || "Ocurrió un error en la conexión");
    });

    socket.emit('checkPlayers', { room: room, userId: idLogged });

    return () => {
      socket.off('timerStarted');
      socket.off('timerUpdate');
      socket.off('gameEnded');
      socket.off('playerJoined');
      socket.off('error');
      socket.off('solicitudNuevaRonda');
      socket.off('solicitudEnviada');
      socket.off('nuevaRondaRechazada');
      socket.off('nuevaRondaIniciada');
      socket.off('esperandoOtroJugador');
      socket.off('respuestasFinalesOponente');
    };
  }, [socket, room, isConnected, nombreUsuario]);


  function guardarRondaEnHistorial(puntosRonda) {
    setHistorialRondas(prev => {

      const yaExiste = prev.some(r => r.numero === rondaActual);
      if (yaExiste) {
        return prev;
      }

      return [...prev, {
        numero: rondaActual,
        letra: letra,
        respuestas: { ...respuestas },
        puntos: puntosRonda
      }];
    });
  }

  // Iniciar el timer cuando estén todos los datos listos
  useEffect(() => {
    if (categorias.length > 0 && letra && socket && room && isConnected && juegoIniciado && rondaActual === 1) {
      console.log("Solicitando inicio de juego");
      setEsperandoOtroJugador(false);
      setEstoyUnido(true);
      socket.emit('startGameTimer', { room });

    }
  }, [categorias, letra, socket, room, isConnected, juegoIniciado, rondaActual]);

  // Temporizador local (backup)
  useEffect(() => {
    let intervalo;
    if (juegoActivo && tiempoRestante > 0) {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => {
          const nuevoTiempo = prev - 1;
          if (nuevoTiempo <= 0) {
            finalizarRondaPorTiempo();
            return 0;
          }
          return nuevoTiempo;
        });
      }, 1000);
    }

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, [juegoActivo, tiempoRestante]);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/Jugadores", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.jugadores && result.jugadores.length > 0) {
        const jugadorActual = result.jugadores.find(
          (j) => j.idusuario == idLogged
        );
        if (jugadorActual) {
          setNombreUsuario(jugadorActual.nombre);
        }
      }
    } catch (error) {
      console.error("Error al obtener nombre:", error);
    }
  }

  function handleInputChange(categoria, valor) {
    setRespuestas((prev) => ({
      ...prev,
      [categoria]: valor,
    }));

    // Enviar respuesta al servidor
    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");
      socket.emit('sendAnswer', {
        room,
        userId: idLogged,
        categoria,
        respuesta: valor
      });
    }
  }

  function finalizarRonda() {
    setJuegoActivo(false);

    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");
      socket.emit('basta', { room, userId: idLogged, respuestas: respuestas });
    }


  }





  function finalizarRondaPorTiempo() {
    if (!juegoActivo) return;

    setJuegoActivo(false)
    guardarRondaEnHistorial();



    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");

      socket.emit('enviarRespuestasFinales', {
        room,
        userId: idLogged,
        respuestas: respuestas
      });
      setRespuestas(respuestas)
      console.log("MIS RESPUESTAS SON: ", respuestas)//esto llega 
      showModal(
        "¡TIEMPO TERMINADO!",
        `Se acabó el tiempo. Esperando que tu oponente envíe sus respuestas para calcular puntos.`
      );
      calcularPuntosSinModal()
    }


  }



  function calcularPuntosSinModal() {
    let puntosRonda = 0;
    const idLogged = localStorage.getItem("idLogged");

    console.log("mis respuestas", respuestas, "respuestaoponente", respuestasOponente)//no llega hasta aca tirs null
    Object.entries(respuestas).forEach(([categoria, respuesta]) => {

      if (!respuestasOponente || !respuestas) {
        console.log("no hay respuestas")
      }

      if (respuestas && respuestasOponente) {
        const respuestaOponente = respuestasOponente?.[categoria];
        const primeraLetraMiRespuesta = respuestas.trim()[0].toUpperCase();
        if (primeraLetraMiRespuesta === letra.toUpperCase() || primeraLetraMiRespuesta === letra.toLowerCase()) {
          if (!respuestaOponente || respuestaOponente.trim() === "") {
            puntosRonda += 20;
          } if (respuesta.trim().toLowerCase() === respuestaOponente.trim().toLowerCase()) {
            puntosRonda += 5;


          } if (respuesta.trim().toLowerCase() !== respuestaOponente.trim().toLowerCase()) {
            puntosRonda += 10;
          } else {
            puntosRonda += 0;
          }
        }

      }
    });

    setPuntos((prev) => prev + puntosRonda);
    return puntosRonda;
  }

  function aceptarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('acceptNuevaRonda', {
      room: solicitudPendiente.room,
      userId: parseInt(localStorage.getItem("idLogged"))
    });

    setSolicitudPendiente(null);
  }

  function rechazarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('rechazarNuevaRonda', {
      room: solicitudPendiente.room,
      idSolicitante: parseInt(solicitudPendiente.idSolicitante)
    });

    setSolicitudPendiente(null);
  }


  function solicitarNuevaRonda() {
    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");
      console.log("Nueva ronda")
      setJuegoActivo(false);
      setEsperandoNuevaRonda(true);

      socket.emit('solicitarNuevaRonda', { room: room, userId: parseInt(idLogged) });

    }
  }


  async function guardarEstadisticas() {//hacer que ande o ponerla directamente 
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) return;

    try {
      await fetch("http://localhost:4001/ActualizarEstadisticas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: nombreUsuario,
          resultado: "ganada",//esto hay q hacerlo bien
          puntos: puntos,
        }),
      });
      showModal("¡Éxito!", "Estadísticas guardadas correctamente");
      router.push("/ranking")
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  }

  async function chequeo() {
    const camposVacios = [];
    const palabrasInvalidas = [];

    categorias.forEach((categoria) => {
      const nombreCategoria = categoria.nombre || categoria;
      const respuesta = respuestas[nombreCategoria];

      if (!respuesta || respuesta.trim() === "") {
        camposVacios.push(nombreCategoria);
      } else {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (primeraLetra !== letra) {
          palabrasInvalidas.push(nombreCategoria);
        }
      }
    });

    if (camposVacios.length > 0) {
      showModal(
        "¡Campos incompletos!",
        `Debes completar todas las categorías antes de decir BASTA`
      );
      return;
    }

    if (palabrasInvalidas.length > 0) {
      showModal(
        "¡Error!",
        `Alguna/s de tus palabras no empiezan con la letra ${letra}`
      );
      return;
    }

    finalizarRonda();
    nuevaRonda(true);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  return (
    <div className={styles.gameContainer}>
      {!isConnected && (
        <div className={styles.connectionWarning}>
          Conectando al servidor.
        </div>
      )}

      {esperandoOtroJugador && isConnected && (
        <div className={styles.waitingMessage}>
          Esperando al otro jugador 
        </div>
      )}

      <div className={styles.topButtons}>
        <Button
          texto="CERRAR SESIÓN"
          className={styles.buttonNaranja}
          onClick={() => {
            localStorage.removeItem("idLogged");
            router.push("/registroYlogin");
          }}
        />
        <Button
          texto="VOLVER"
          className={styles.buttonBlue}
          onClick={() => {
            router.push("/lobby");
          }}
        />
        <Button
          texto="TERMINAR PARTIDA"
          className={styles.buttonVioleta}
          onClick={() => {
            guardarEstadisticas();{/*fijarse si andaa*/}
          }}
        />
        <div className={styles.timerContainer}>
          <span className={styles.hourglassIcon}>⏳</span>
          <span className={`${styles.timerText} ${tiempoRestante <= 30 ? styles.timerWarning : ''}`}>
            {formatTime(tiempoRestante)}
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerCell}>L</th>
              {categorias.map((categoria, index) => (
                <th key={index} className={styles.headerCell}>
                  {categoria.nombre || categoria}
                </th>
              ))}
              <th className={styles.headerCell}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {historialRondas.map((ronda, indexRonda) => (
              <tr key={`ronda-${indexRonda}`} className={styles.historialRow}>
                <td className={styles.letraCell}>{ronda.letra}</td>
                {categorias.map((categoria, indexCat) => {
                  const nombreCategoria = categoria.nombre || categoria;
                  return (
                    <td key={indexCat} className={styles.respuestaCell}>
                      {ronda.respuestas[nombreCategoria] || "-"}
                    </td>
                  );
                })}
                <td className={styles.puntosCell}>{ronda.puntos}</td>
              </tr>
            ))}

            {!solicitudPendiente && !esperandoNuevaRonda && juegoActivo && (


              <tr className={styles.currentRow}>
                <td className={styles.letraCell}>{letra || "-"}</td>
                {categorias.map((categoria, index) => {
                  const nombreCategoria = categoria.nombre || categoria;

                  return (
                    <td key={index} className={styles.inputCell}>

                      <Input
                        value={respuestas[nombreCategoria] || ""}
                        onChange={(e) => handleInputChange(nombreCategoria, e.target.value)}
                        placeholder={juegoActivo ? `${letra}...` : ""}
                        className={`${styles.input} ${!juegoActivo ? styles.inputDisabled : ""}`}
                      />
                    </td>

                  );
                })}
                <td className={styles.puntosCell}>{puntos}</td>
              </tr>

            )
            }

          </tbody>
        </table>

      </div>

      <div className={styles.bottomButton}>
        <Button
          texto="BASTA PARA MI, BASTA PARA TODOS"
          onClick={chequeo}
          className={styles.buttonRed}
          disabled={!juegoActivo}
        />

      </div>
      {solicitudPendiente && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Solicitud de Nueva ronda</h3>
            </div>

            <div className={styles.solicitudContent}>
              <p className={styles.solicitudTexto}>
                <strong>{solicitudPendiente.nombreSolicitante}</strong> quiere jugar otra ronda
              </p>

              <div className={styles.solicitudBotones}>
                <Button
                  texto="Aceptar"
                  onClick={aceptarSolicitud}
                  className={styles.btnAceptar}

                />
                <Button
                  texto="Rechazar"
                  className={styles.btnRechazar}
                  onClick={rechazarSolicitud}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        {!juegoActivo && !esperandoNuevaRonda && historialRondas.length > 0 && (
          <div className={styles.bottomButton}>
            <Button
              texto="JUGAR NUEVA RONDA"
              onClick={solicitarNuevaRonda}
              className={styles.buttonBlue}
            />
          </div>
        )}
      </div>

      {modal.open && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage}>{modal.message}</p>
            <Button
              texto="CERRAR"
              onClick={closeModal}
              className={styles.buttonBlue}
            />
          </div>
        </div>
      )}
    </div>
  );
}