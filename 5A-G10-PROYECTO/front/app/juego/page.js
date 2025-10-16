"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function TuttiFrutti() {
  const [letra, setLetra] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(60);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [todasCategorias, setTodasCategorias] = useState([]);
  const router = useRouter();

  useEffect(() => {
    cargarNombreUsuario();
    cargarCategorias();
  }, []);

  useEffect(() => {
    let intervalo;
    if (juegoActivo && tiempoRestante > 0) {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (tiempoRestante === 0 && juegoActivo) {
      finalizarRonda();
    }
    return () => clearInterval(intervalo);
  }, [juegoActivo, tiempoRestante]);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch(`http://localhost:4001/Jugadores`, {
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

  async function cargarCategorias() {
    try {
      const response = await fetch(`http://localhost:4001/Categorias`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.categorias && result.categorias.length > 0) {
        setTodasCategorias(result.categorias);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  function seleccionarCategoriasAleatorias() {
    const cantidadCategorias = Math.min(7, todasCategorias.length);
    const categoriasAleatorias = [];
    const copiaCategorias = [...todasCategorias];

    for (let i = 0; i < cantidadCategorias; i++) {
      const indiceAleatorio = Math.floor(Math.random() * copiaCategorias.length);
      categoriasAleatorias.push(copiaCategorias[indiceAleatorio]);
      copiaCategorias.splice(indiceAleatorio, 1);
    }

    return categoriasAleatorias;
  }

  function iniciarJuego() {
    if (todasCategorias.length === 0) {
      alert("No hay categorías disponibles");
      return;
    }

    const letrasDisponibles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letraAleatoria = letrasDisponibles[Math.floor(Math.random() * letrasDisponibles.length)];
    
    const categoriasSeleccionadas = seleccionarCategoriasAleatorias();
    
    setLetra(letraAleatoria);
    setCategorias(categoriasSeleccionadas);
    setRespuestas({});
    setTiempoRestante(60);
    setJuegoActivo(true);
  }

  function handleInputChange(categoria, valor) {
    setRespuestas({
      ...respuestas,
      [categoria]: valor
    });
  }

  function finalizarRonda() {
    setJuegoActivo(false);
    calcularPuntos();
  }

  function calcularPuntos() {
    let puntosRonda = 0;
    
    Object.entries(respuestas).forEach(([categoria, respuesta]) => {
      if (respuesta && respuesta.trim() !== "") {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (primeraLetra === letra) {
          puntosRonda += 10;
        } else {
          puntosRonda += 5;
        }
      }
    });

    setPuntos(puntos + puntosRonda);
    alert(`¡Ronda finalizada! Ganaste ${puntosRonda} puntos`);
  }

  async function guardarEstadisticas() {
    const idLogged = localStorage.getItem("idLogged");
    if (!idLogged) return;

    try {
      await fetch("http://localhost:4001/ActualizarEstadisticas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: nombreUsuario,
          resultado: "ganada",
          puntos: puntos
        })
      });
      alert("¡Estadísticas guardadas!");
      router.push("/amigos");
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            ¡Hola, <span className={styles.nombreDestacado}>{nombreUsuario}</span>!
          </span>
        </div>
        <div className={styles.gameInfo}>
          <div className={styles.puntosBox}>
            Puntos: <strong>{puntos}</strong>
          </div>
          {juegoActivo && (
            <div className={styles.timerBox}>
              Tiempo: <strong>{tiempoRestante}s</strong>
            </div>
          )}
        </div>
      </div>

      {!juegoActivo && categorias.length === 0 && (
        <div className={styles.welcomeBox}>
          <h2 className={styles.welcomeTitle}>¡Bienvenido al Tutti Frutti!</h2>
          <p className={styles.welcomeText}>
            Presiona "INICIAR JUEGO" para comenzar una nueva ronda
          </p>
          <button className={styles.startButton} onClick={iniciarJuego}>
            INICIAR JUEGO
          </button>
        </div>
      )}

      {(juegoActivo || (!juegoActivo && categorias.length > 0)) && (
        <div className={styles.gameContainer}>
          <div className={styles.letraBox}>
            <span className={styles.letraLabel}>Letra:</span>
            <span className={styles.letraGrande}>{letra}</span>
          </div>

          <div className={styles.tablaContainer}>
            <div className={styles.tablaHeader}>
              <div className={styles.headerCell}>CATEGORÍA</div>
              <div className={styles.headerCell}>TU RESPUESTA</div>
            </div>

            <div className={styles.tablaBody}>
              {categorias.map((cat) => (
                <div key={cat.idcategoria} className={styles.filaCategoria}>
                  <div className={styles.categoriaLabel}>{cat.nombre}</div>
                  <input
                    type="text"
                    className={styles.inputRespuesta}
                    value={respuestas[cat.nombre] || ""}
                    onChange={(e) => handleInputChange(cat.nombre, e.target.value)}
                    disabled={!juegoActivo}
                    placeholder={`Escribe con ${letra}...`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.buttonsContainer}>
            {juegoActivo && (
              <button className={styles.stopButton} onClick={finalizarRonda}>
                ¡BASTA!
              </button>
            )}
            {!juegoActivo && (
              <>
                <button className={styles.nuevaRondaButton} onClick={iniciarJuego}>
                  NUEVA RONDA
                </button>
                <Button className={styles.guardarButton} onClick={guardarEstadisticas}>
                  GUARDAR Y SALIR
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}