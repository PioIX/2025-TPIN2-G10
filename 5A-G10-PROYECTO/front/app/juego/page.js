"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../components/Button";
import Input from "../components/Input";
import styles from "./page.module.css";
import { useSocket } from "../../hook/useSocket";
import { useConnection } from "../../hook/useConnection";

export default function TuttiFrutti() {
  const [rondas, setRondas] = useState([]);
  const [inputs, setInputs] = useState({});
  const [letra, setLetra] = useState("");
  const [palabras, setPalabras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(40);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [puntosRonda, setPuntosRonda] = useState(0);
  const [historialRondas, setHistorialRondas] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [room, setRoom] = useState("");
  const [juegoIniciado, setJuegoIniciado] = useState(false);
  const [esperandoOtroJugador, setEsperandoOtroJugador] = useState(true);
  const [estoyUnido, setEstoyUnido] = useState(false);
  const [nuevaRonda, setNuevaRonda] = useState(false);
  const [puntosOponente, setPuntosOponente] = useState(0);
  const [rondaActual, setRondaActual] = useState(1);
  const [esperandoNuevaRonda, setEsperandoNuevaRonda] = useState(false);
  const [respuestasOponente, setRespuestasOponente] = useState(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const [respuestasValidadas, setRespuestasValidadas] = useState({});
  const [idOponente, setIdOponente] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const { url } = useConnection();

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };


  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    cargarNombreUsuario();

    const roomParam = searchParams.get("room");
    const categoriasParam = searchParams.get("categorias");
    const letraParam = searchParams.get("letra");

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

  useEffect(() => {
    if (!socket || !room || !isConnected) {
      console.log("Esperando conexión...", { socket: !!socket, room, isConnected });
      return;
    }

    console.log("Uniéndose a la sala:", room);
    const idLogged = localStorage.getItem("idLogged");

    socket.emit("joinRoom", {
      room,
      userId: idLogged,
      username: nombreUsuario,
    });

    socket.on("timerStarted", (data) => {
      console.log("Timer iniciado:", data);
      setJuegoActivo(true);
      setJuegoIniciado(true);
      setEsperandoOtroJugador(false);
      setEstoyUnido(true);
      if (data.timeRemaining) {
        setTiempoRestante(data.timeRemaining);
      }
    });

    socket.on("timerUpdate", (data) => {
      console.log("Timer actualizado:", data.timeRemaining);
      setTiempoRestante(data.timeRemaining);
    });

    socket.on("tiempoTerminado", async (data) => {
      console.log("termino el tiempo");
      console.log("   Data recibida:", data);
      setTiempoRestante(0);
      finalizarRondaPorTiempo();
    });

    socket.on("gameEnded", (data) => {
      console.log("Juego terminado:", data);

      setJuegoActivo(false);

      //  GUARDAR RESPUESTAS DE ESTA RONDA ANTES DE QUE SE PIERDAN
      /*function guardarRondaEnHistorial(snapshot) {
        if (!snapshot) return;

        const numero = snapshot.numero;
        const letraSnapshot = snapshot.letra || "-";
        const puntosSnapshot = snapshot.puntos || 0;

        // Normalizar respuestas para que NUNCA falte una categoría
        let respuestasFinales = {};

        categorias.forEach(cat => {
          const nombreCat = cat.nombre || cat;
          const respuesta = snapshot.respuestas?.[nombreCat];

          if (!respuesta) {
            // Si no respondió nada → guion y valida=false
            respuestasFinales[nombreCat] = {
              palabra: "-",
              valida: false
            };
          } else {
            // Copiamos la existente
            respuestasFinales[nombreCat] = {
              palabra: respuesta.palabra || "-",
              valida: !!respuesta.valida
            };
          }
        });

        setHistorialRondas(prev => {
          // Evitar duplicados por número
          const existe = prev.some(r => r.numero === numero);
          if (existe) {
            console.log("Ronda ya guardada, no la duplico:", numero);
            return prev;
          }

          const nueva = {
            id: `ronda-${numero}-${letraSnapshot}`,
            numero,
            letra: letraSnapshot,
            respuestas: respuestasFinales,
            puntos: puntosSnapshot
          };

          console.log(" Ronda guardada:", nueva);
          return [...prev, nueva];
        });
      } */

      if (data.respuestas) {
        setRespuestasOponente(data.respuestas);
      }

      showModal("¡BASTA!", data.message || "Un jugador dijo BASTA.");
    });

    socket.on("respuestasFinalesOponente", (data) => {
      console.log("Respuestas finales del oponente:", data);
      setRespuestasOponente(data.respuestas);
      const idLogged = localStorage.getItem("idLogged");
      if (data.id != idLogged) {
        console.log("¡Ronda Finalizada!", `Obtuviste ${puntosRonda} puntos.`);
        showModal("¡Ronda Finalizada!", `Obtuviste ${puntosRonda} puntos.`);
      }
    });

    socket.on("solicitudNuevaRonda", (data) => {
      const idLogged = localStorage.getItem("idLogged");
      if (data.idSolicitante != idLogged) {
        console.log("Solicitud de nueva ronda recibida:", data);
        setSolicitudPendiente({
          idSolicitante: parseInt(idLogged),
          nombreSolicitante: nombreUsuario,
          room: data.room,
        });
      }
    });

    socket.on("solicitudEnviada", (data) => {
      const idLogged = localStorage.getItem("idLogged");
      if (data.userId == idLogged) {
        showModal("Solicitud enviada", data.message);
      }
    });

    socket.on("nuevaRondaRechazada", (data) => {
      console.log("Nueva ronda rechazada:", data);
      setEsperandoNuevaRonda(false);
      showModal("Ronda rechazada", data.message);
    });

    socket.on("nuevaRondaIniciada", (data) => {
      console.log("Nueva ronda iniciada:", data);
      closeModal();
      setLetra(data.letra);
      setRondaActual(data.ronda);

      // RESETEAMOS SOLO LOS INPUTS DE LA RONDA ACTUAL
      // SIN borrar rondas anteriores del historial
      const respuestasVacias = {};
      categorias.forEach(cat => {
        const nombre = cat.nombre || cat;
        respuestasVacias[nombre] = "";
      });
      setRespuestas(respuestasVacias);
      // limpiamos lo temporal, no el historial
      setRespuestasOponente(null);
      setRespuestasValidadas({});
      setPuntosRonda(0);
      setTiempoRestante(40);
      setEsperandoNuevaRonda(false);
      setJuegoActivo(true);

      //  REINICIO EL TIMER
      setTimeout(() => {
        socket.emit("startGameTimer", { room });
      }, 300);
    });

    socket.on("esperandoOtroJugador", (data) => {
      console.log(data.mensaje);
      setEsperandoNuevaRonda(true);
    });

    socket.on("playerJoined", (data) => {
      console.log("Jugador unido:", data);
      if (data.playersCount >= 2) {
        setEsperandoOtroJugador(false);
        setEstoyUnido(true);
      }
    });

    socket.on("contarJugadores", (data) => {
      console.log("Contar jugadores:", data);
      const idLogged = localStorage.getItem("idLogged");
      if (data.userId !== idLogged) {
        setEsperandoOtroJugador(false);
        setEstoyUnido(true);
        socket.emit("startGameTimer", { room });
      }
    });

    socket.on("error", (error) => {
      console.error("Error del socket:", error);
      showModal("Error", error.message || "Ocurrió un error en la conexión");
    });

    socket.emit("checkPlayers", { room: room, userId: idLogged });

    return () => {
      socket.off("timerStarted");
      socket.off("timerUpdate");
      socket.off("tiempoTerminado");
      socket.off("gameEnded");
      socket.off("playerJoined");
      socket.off("error");
      socket.off("solicitudNuevaRonda");
      socket.off("solicitudEnviada");
      socket.off("nuevaRondaRechazada");
      socket.off("nuevaRondaIniciada");
      socket.off("esperandoOtroJugador");
      socket.off("respuestasFinalesOponente");
    };
  }, [socket, room, isConnected, nombreUsuario, respuestas, rondaActual, letra, puntosRonda]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("resultadosRonda", (data) => {
      console.log("RESULTADOS DE LA RONDA");
      console.log("Resultados de la ronda recibidos:", data);

      const { jugador1, jugador2, ronda, letra: letraRonda } = data;
      const idLogged = parseInt(localStorage.getItem("idLogged"), 10);
      // Determinar quién soy yo y quién es el oponente
      let misDatos, datosOponente;

      if (jugador1.userId === idLogged) {
        misDatos = jugador1;
        datosOponente = jugador2;
      } else {
        misDatos = jugador2;
        datosOponente = jugador1;
      }

      console.log(` Mis puntos de ESTA ronda: ${misDatos.puntos}`);
      console.log(` Mis respuestas:`, misDatos.respuestas);
      // actualizar puntos de la ronda actual 
      setPuntosRonda(misDatos.puntos);
      // guardar en historial con las respuestas VALIDADAS
      guardarRondaEnHistorial({
        numero: ronda,
        letra: letraRonda,
        respuestas: { ...misDatos.respuestas }, 
        puntos: misDatos.puntos, // PUNTOS DE ESTA RONDA SOLAMENTE
      });

      // Actualizar puntos totales ACUMULADOS
      setPuntos((prev) => {
        const nuevoTotal = prev + misDatos.puntos;
        console.log(`puntos totales acumulados: ${prev} + ${misDatos.puntos} = ${nuevoTotal}`);
        return nuevoTotal;
      });

      setPuntosOponente((prev) => prev + datosOponente.puntos);
      setPuntosRonda(misDatos.puntos);
      setIdOponente(datosOponente.userId);
      setRespuestasOponente(datosOponente.respuestas);

      mostrarResultadosDetallados(
        misDatos.respuestas,
        datosOponente.respuestas,
        misDatos.puntos,
        datosOponente.puntos
      );

      setJuegoActivo(false);
      closeModal();
      });

    return () => {
      socket.off("resultadosRonda");
    };
  }, [socket, isConnected]);

  function guardarRondaEnHistorial(snapshot) {
    if (!snapshot) return;

    const numero = snapshot.numero ?? (historialRondas.length + 1);
    const letraSnapshot = snapshot.letra ?? letra ?? "-";
    const respuestasSnapshot = snapshot.respuestas ? { ...snapshot.respuestas } : {};
    const puntosSnapshot = snapshot.puntos ?? 0;

    setHistorialRondas((prev) => {
      const existe = prev.some((r) => r.numero === numero && r.letra === letraSnapshot);

      if (existe) {
        console.log(" Ronda duplicada (número + letra), no se agrega:", numero, letraSnapshot);
        return prev;
      }

      const nueva = {
        id: `ronda-${numero}-${letraSnapshot}`,
        numero,
        letra: letraSnapshot,
        respuestas: respuestasSnapshot,
        puntos: puntosSnapshot,
      };
      return [...prev, nueva];
    });
  }

  useEffect(() => {
    if (categorias.length > 0 && letra && socket && room && isConnected && juegoIniciado && rondaActual === 1) {
      console.log("Solicitando inicio de juego");
      setEsperandoOtroJugador(false);
      setEstoyUnido(true);
      socket.emit("startGameTimer", { room });
    }
  }, [categorias, letra, socket, room, isConnected, juegoIniciado, rondaActual]);

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

  function mostrarResultadosDetallados(misRespuestas, respuestasOponente, misPuntos, puntosOponente) {
    let detalles = `Tus puntos: ${misPuntos}\nPuntos del oponente: ${puntosOponente}\n\n`;
    //esto es lo q t dice si eta bien o no
    categorias.forEach((cat) => {
      const nombreCat = cat.nombre || cat;
      const miResp = misRespuestas?.[nombreCat];
      const respOpo = respuestasOponente?.[nombreCat];

      detalles += `${nombreCat}:\n`;
      detalles += `  Tú: ${miResp?.palabra || miResp?.palabra === "" ? (miResp?.palabra || "vacío") : "vacío"} ${miResp?.valida ? "✓" : "✗"}`;

      if (miResp?.fuente === "rae") detalles += ` (RAE)`;
      detalles += `\n`;
      detalles += `  Oponente: ${respOpo?.palabra || "vacío"} ${respOpo?.valida ? "✓" : "✗"}`;
      if (respOpo?.fuente === "rae") detalles += ` (RAE)`;
      detalles += `\n\n`;
    });

    const usaronRAE =
      Object.values(misRespuestas || {}).some((r) => r?.fuente === "rae") ||
      Object.values(respuestasOponente || {}).some((r) => r?.fuente === "rae");

    if (usaronRAE) detalles += `\n(RAE) = Validada por el Diccionario de la RAE`;

    console.log(detalles);
  }

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch(`${url}/Jugadores`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.jugadores && result.jugadores.length > 0) {
        const jugadorActual = result.jugadores.find((j) => j.idusuario == idLogged);
        if (jugadorActual) {
          setNombreUsuario(jugadorActual.nombre);
        }
      }
    } catch (error) {
      console.error("Error al obtener nombre:", error);
    }
  }

  async function verificarPalabra(palabra, categoria) {
    try {
      const palabraNormalizada = palabra.trim();
      const categoriaNormalizada = categoria.trim();

      console.log(`Verificando palabra: "${palabraNormalizada}" en categoría: "${categoriaNormalizada}"`);

      //RAE
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `${url}/VerificarPalabra?palabra=${encodeURIComponent(palabraNormalizada)}&categoria=${encodeURIComponent(categoriaNormalizada)}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("Error en la respuesta:", response.status);
        return { existe: false, mensaje: "Error al verificar" };
      }

      const data = await response.json();
      console.log("Respuesta de verificación:", data);

      return {
        existe: data.existe,
        mensaje: data.mensaje,
        fuente: data.fuente,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("timeout al verificar palabra:", palabra, "- Se considera inválida");
        return { existe: false, mensaje: "Timeout - palabra no verificada" };
      }
      console.log("Error al verificar palabra:", palabra, error.message);
      return { existe: false, mensaje: "Error de conexión" };
    }
  }

  async function verificarTodasLasRespuestas(respuestasObj) {
    const verificaciones = Object.entries(respuestasObj || {}).map(async ([categoria, palabra]) => {
      if (!palabra || palabra.trim() === "") {
        return [categoria, {
          palabra: "",
          valida: false,
          mensaje: "Campo vacío",
        }];
      }

      const palabraLimpia = palabra.trim();
      const primeraLetra = palabraLimpia[0].toUpperCase();

      // Validar longitud mínima (3 letras)
      if (palabraLimpia.length < 3) {
        console.log(`"${palabraLimpia}" en "${categoria}": ✗ MUY CORTA (menos de 3 letras)`);
        return [categoria, {
          palabra: palabraLimpia,
          valida: false,
          mensaje: "Debe tener al menos 3 letras",
        }];
      }

      // Validar que empiece con la letra correcta
      if (primeraLetra !== letra.toUpperCase()) {
        return [categoria, {
          palabra: palabraLimpia,
          valida: false,
          mensaje: `No empieza con ${letra.toUpperCase()}`,
        }];
      }

      // Verificar la palabra (esto se hace en paralelo)
      const verificacion = await verificarPalabra(palabraLimpia, categoria);

      console.log(`"${palabraLimpia}" en "${categoria}": ${verificacion.existe ? "✓ VÁLIDA" : "✗ NO VÁLIDA"} - ${verificacion.mensaje}`);

      return [categoria, {
        palabra: palabraLimpia,
        valida: verificacion.existe,
        mensaje: verificacion.mensaje || (verificacion.existe ? "Válida" : "No existe"),
        fuente: verificacion.fuente,
      }];
    });
    const resultadosArray = await Promise.all(verificaciones);
    const resultados = Object.fromEntries(resultadosArray);

    console.log("verificación completada:", resultados);
    return resultados;
  }

  function handleInputChange(categoria, valor) {
    const valorMayus = valor.toUpperCase();

    setRespuestas(prev => ({
      ...prev,
      [categoria]: valorMayus
    }));

    // NO BORRA NADA, NO REEMPLAZA RONDAS ANTERIORES
    // SOLO ENVÍA LA RESPUESTA ACTUAL
    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");

      socket.emit("sendAnswer", {
        room,
        userId: idLogged,
        categoria,
        respuesta: valorMayus
      });
    }
  }


  async function finalizarRonda() {
    if (socket && room && isConnected) {
      const idLogged = parseInt(localStorage.getItem("idLogged"), 10);

      // Emitir evento BASTA para terminar el tiempo de ambos jugadores
      socket.emit("basta", {
        room,
        userId: idLogged
      });
    }
  }

  async function finalizarRondaPorTiempo() {
    if (!juegoActivo) return;

    console.log("Tiempo terminado. Finalizando ronda...");
    setJuegoActivo(false);

    const resultadosVerificacion = await verificarTodasLasRespuestas(respuestas);
    console.log("Respuestas verificadas:", resultadosVerificacion);

    setRespuestasValidadas(resultadosVerificacion);
    if (socket && room && isConnected) {
      const idLogged = parseInt(localStorage.getItem("idLogged"), 10);

      socket.emit("enviarRespuestasValidadas", {
        room,
        userId: idLogged,
        respuestasValidadas: resultadosVerificacion,
      });

      console.log("Respuestas validadas enviadas al servidor");

      showModal("⏰ ¡TIEMPO TERMINADO!", "Verificando palabras y calculando puntos...");
    }
  }

  function aceptarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit("acceptNuevaRonda", {
      room: solicitudPendiente.room,
      userId: parseInt(localStorage.getItem("idLogged"), 10),
    });

    setSolicitudPendiente(null);
  }

  function rechazarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit("rechazarNuevaRonda", {
      room: solicitudPendiente.room,
      idSolicitante: parseInt(solicitudPendiente.idSolicitante, 10),
    });

    setSolicitudPendiente(null);
  }

  function solicitarNuevaRonda() {
    if (socket && room && isConnected) {
      const idLogged = localStorage.getItem("idLogged");
      console.log("Nueva ronda");
      setJuegoActivo(false);
      setEsperandoNuevaRonda(true);

      socket.emit("solicitarNuevaRonda", { room: room, userId: parseInt(idLogged, 10) });
    }
  }
  async function guardarEstadisticas() {
    const idLogged = localStorage.getItem("idLogged");
    const mail = localStorage.getItem("mail");

    if (!idLogged) return;

    let puntosGanador = 0;
    let empate = false;
    let idGanador = [];

    // Calculos de quien ganó
    if (puntos > puntosOponente) {
      // YO GANÉ - Solo sumo MIS puntos
      puntosGanador = puntos;
      idGanador = [parseInt(idLogged), parseInt(idOponente)]; // [ganador, perdedor]
      empate = false;

    } else if (puntos < puntosOponente) {
      // YO PERDÍ - Solo suma el oponente SUS puntos
      puntosGanador = puntosOponente;
      idGanador = [parseInt(idOponente), parseInt(idLogged)]; // [ganador, perdedor]
      empate = false;

    } else {
      // EMPATE - Ambos suman sus puntos (son iguales)
      puntosGanador = puntos; // Es lo mismo que puntosOponente
      idGanador = [parseInt(idLogged), parseInt(idOponente)];
      empate = true;
    }

    try {
      const response = await fetch("http://localhost:4001/ActualizarEstadisticas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idGanador, // [idGanador, idPerdedor] o [id1, id2] si empate
          puntosGanador, // Solo los puntos del ganador (o iguales si empate)
          empate
        }),
      });

      const result = await response.json();

      if (result.ok) {
        showModal("¡Éxito!", "Estadísticas guardadas correctamente");
        setTimeout(() => {
          router.push("/ranking");
        }, 1500);
      } else {
        showModal("Error", result.res || "No se pudieron guardar las estadísticas");
      }

    } catch (error) {
      console.error("Error al actualizar estadísticas:", error);
      showModal("Error", "No se pudo conectar con el servidor");
    }
  }
  async function chequeo() {
    const resultadosVerificacion = await verificarTodasLasRespuestas(respuestas);
    const palabrasInvalidas = Object.entries(resultadosVerificacion).filter(([_, resultado]) => !resultado.valida && resultado.palabra !== "");
    const camposVacios = Object.entries(resultadosVerificacion).filter(([_, resultado]) => resultado.palabra === "");

    if (camposVacios.length > 0) {
      showModal("¡Campos incompletos!", `Debes completar todas las categorías antes de decir BASTA`);
      return;
    }

    if (palabrasInvalidas.length > 0) {
      const mensajesError = palabrasInvalidas.map(([cat, res]) => `${cat}: ${res.mensaje}`).join("\n");
      showModal("¡Palabras inválidas!", `Las siguientes respuestas no son válidas:\n${mensajesError}`);
      return;
    }
    finalizarRonda(resultadosVerificacion);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.gameContainer}>
      {!isConnected && <div className={styles.connectionWarning}>Conectando al servidor...</div>}

      {esperandoOtroJugador && isConnected && <div className={styles.waitingMessage}>Esperando al otro jugador...</div>}

      <div className={styles.topButtons}>
        <Button
          texto="CERRAR SESIÓN"
          className={styles.buttonNaranja}
          onClick={() => {
            localStorage.removeItem("idLogged");
            router.push("/registroYlogin");
          }}
        />
        <Button texto="VOLVER" className={styles.buttonBlue} onClick={() => router.push("/lobby")} />
        <Button texto="TERMINAR PARTIDA" className={styles.buttonVioleta} onClick={() => guardarEstadisticas()} />
        <div className={styles.timerContainer}>
          <span className={styles.hourglassIcon}>⏳</span>
          <span className={`${styles.timerText} ${tiempoRestante <= 30 ? styles.timerWarning : ""}`}>{formatTime(tiempoRestante)}</span>
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
            {historialRondas.map((ronda) => (
              <tr key={ronda.id} className={styles.historialRow}>
                <td className={styles.letraCell}>{ronda.letra}</td>
                {categorias.map((cat) => {
                  const nombreCat = cat.nombre || cat;
                  const dato = ronda.respuestas[nombreCat];

                  const palabra = dato?.palabra ?? "-";
                  const esValida = dato?.valida ?? false;

                  return (
                    <td key={nombreCat} className={styles.inputCell}>
                      <input
                        type="text"
                        value={palabra}
                        readOnly
                        disabled
                        className={`${styles.input} ${styles.inputDisabled} ${esValida ? styles.inputValido : styles.inputInvalido}`}
                      />
                    </td>
                  );
                })}
                <td className={styles.puntosCell}>{ronda.puntos}</td>
              </tr>
            ))}
            {juegoActivo && (
              <tr className={styles.rondaActualRow}>
                <td className={styles.letraCell}>{letra}</td>

                {categorias.map((cat) => {
                  const nombreCat = cat.nombre || cat;

                  return (
                    <td key={nombreCat} className={styles.inputCell}>
                      <input
                        type="text"
                        value={respuestas[nombreCat] || ""}
                        onChange={(e) => handleInputChange(nombreCat, e.target.value)}
                        className={styles.input}
                        placeholder="..."
                      />
                    </td>
                  );
                })}

                <td className={styles.puntosCell}>{puntosRonda}</td>
              </tr>
            )}

          </tbody>
        </table>
      </div>

      <div className={styles.bottomButton}>
        <Button texto="BASTA PARA MI, BASTA PARA TODOS" onClick={chequeo} className={styles.buttonRed} disabled={!juegoActivo} />
      </div>

      {solicitudPendiente && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              <h3>Solicitud de Nueva ronda</h3>
            </div>

            <div className={styles.solicitudContent}>
              <p className={styles.solicitudTexto}>
                <strong>{solicitudPendiente.nombreSolicitante}</strong> quiere jugar otra ronda
              </p>

              <div className={styles.solicitudBotones}>
                <Button texto="Aceptar" onClick={aceptarSolicitud} className={styles.btnAceptar} />
                <Button texto="Rechazar" onClick={rechazarSolicitud} className={styles.btnRechazar} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        {!juegoActivo && !esperandoNuevaRonda && historialRondas.length > 0 && (
          <div className={styles.bottomButton}>
            <Button texto="JUGAR NUEVA RONDA" onClick={solicitarNuevaRonda} className={styles.buttonBlue} />
          </div>
        )}
      </div>

      {modal.open && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage} style={{ whiteSpace: "pre-line" }}>
              {modal.message}
            </p>
            <Button texto="CERRAR" onClick={closeModal} className={styles.buttonBlue} />
          </div>
        </div>
      )}
    </div>
  );
}