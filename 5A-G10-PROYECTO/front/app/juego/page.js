"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";
import { useSocket } from "../../hook/useSocket";

export default function TuttiFrutti() {
  const [letra, setLetra] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(120);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [room, setRoom] = useState("");
  const [juegoIniciado, setJuegoIniciado] = useState(false);
  const [esperandoOtroJugador, setEsperandoOtroJugador] = useState(true);
  const [nuevaLetra, setNuevaLetra] =useState("");
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

  // Unirse a la sala cuando el socket esté conectado
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

    // Escuchar eventos del socket
    socket.on('timerStarted', (data) => {
      console.log("Timer iniciado:", data);
      setJuegoActivo(true);
      setJuegoIniciado(true);
      setEsperandoOtroJugador(false);
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
      showModal("¡BASTA!", data.message || "Un jugador dijo BASTA");
    });

    socket.on('playerJoined', (data) => {
      console.log("Jugador unido:", data);
      if (data.playersCount >= 2) {
        setEsperandoOtroJugador(false);
      }
    });

    socket.on('error', (error) => {
      console.error("Error del socket:", error);
      showModal("Error", error.message || "Ocurrió un error en la conexión");
    });

    return () => {
      socket.off('timerStarted');
      socket.off('timerUpdate');
      socket.off('gameEnded');
      socket.off('playerJoined');
      socket.off('error');
    };
  }, [socket, room, isConnected, nombreUsuario]);

  // Iniciar el timer cuando estén todos los datos listos
  useEffect(() => {
    if (categorias.length > 0 && letra && socket && room && isConnected && !juegoIniciado) {
      console.log("Solicitando inicio de juego");
      setEsperandoOtroJugador(false);
      socket.emit('startGameTimer', { room });
    }
  }, [categorias, letra, socket, room, isConnected, juegoIniciado]);

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
      socket.emit('basta', { room, userId: idLogged });
    }
    
    calcularPuntos();
  }

  function finalizarRondaPorTiempo() {
    if (!juegoActivo) return; // Evitar ejecución múltiple
    
    setJuegoActivo(false);
    const puntosCalculados = calcularPuntosSinModal();
    showModal(
      "¡TIEMPO TERMINADO!",
      `Se acabó el tiempo. Obtuviste ${puntosCalculados} puntos con las palabras que completaste.`
    );
  }

  function calcularPuntos() {
    let puntosRonda = 0;

    Object.entries(respuestas).forEach(([_, respuesta]) => {
      if (respuesta && respuesta.trim() !== "") {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (primeraLetra === letra) {
          puntosRonda += 10;
        }
      }
    });

    setPuntos((prev) => prev + puntosRonda);
    showModal("¡Ronda finalizada!", `Ganaste ${puntosRonda} puntos`);
  }

  function calcularPuntosSinModal() {
    let puntosRonda = 0;

    Object.entries(respuestas).forEach(([_, respuesta]) => {
      if (respuesta && respuesta.trim() !== "") {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (idLogged == idSolicitante) {
          if (primeraLetra === letra && respuesta.toLowerCase() == respuestaOponente.toLowerCase()) {
            puntosRonda += 5;
            if (primeraLetra === letra && respuesta.toLowerCase() != respuestaOponente.toLowerCase()) {
              puntosRonda += 10;
              if (primeraLetra === letra && respuestaOponente == null || respuestaOponente.trim() === "") {
                puntosRonda += 20;
              } else {
                puntosRonda += 0;
              }
            } 
          }  
        }
        
      }
    });

    setPuntos((prev) => prev + puntosRonda);
    return puntosRonda;
  }

  async function guardarEstadisticas() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) return;

    try {
      await fetch("http://localhost:4001/ActualizarEstadisticas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: nombreUsuario,
          resultado: "ganada",
          puntos: puntos,
        }),
      });
      showModal("¡Éxito!", "Estadísticas guardadas correctamente");
      setTimeout(() => {
        router.push("/lobby");
      }, 2000);
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
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  function cambiarLetra(){
    const letrasDisponibles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nuevaLetra = letrasDisponibles[Math.floor(Math.random() * letrasDisponibles.length)];
    setNuevaLetra(nuevaLetra);
  }

  return (
    <div className={styles.gameContainer}>
      {/* Indicador de conexión */}
      {!isConnected && (
        <div className={styles.connectionWarning}>
          ⚠️ Conectando al servidor...
        </div>
      )}
      
      {esperandoOtroJugador && isConnected && (
        <div className={styles.waitingMessage}>
          ⏳ Esperando a otro jugador...
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
          texto="CAMBIAR LETRA"
          className={styles.buttonVioleta}
          onClick={() => cambiarLetra()}
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
            <tr>
              <td className={styles.letraCell}>{letra || "-"}</td>
              {categorias.map((categoria, index) => {
                const nombreCategoria = categoria.nombre || categoria;
                return (
                  <td key={index} className={styles.inputCell}>
                    <input
                      type="text"
                      value={respuestas[nombreCategoria] || ""}
                      onChange={(e) => handleInputChange(nombreCategoria, e.target.value)}
                      disabled={!juegoActivo}
                      placeholder={juegoActivo ? `${letra}...` : ""}
                      className={`${styles.input} ${!juegoActivo ? styles.inputDisabled : ""}`}
                    />
                  </td>
                );
              })}
              <td className={styles.puntosCell}>{puntos}</td>
            </tr>
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