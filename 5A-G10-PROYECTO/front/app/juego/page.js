"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";

export default function TuttiFrutti() {
  const [letra, setLetra] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [tiempoRestante, setTiempoRestante] = useState(120);
  const [juegoActivo, setJuegoActivo] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [todasCategorias, setTodasCategorias] = useState([]);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const router = useRouter();

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

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

  async function cargarCategorias() {
    try {
      const response = await fetch("http://localhost:4001/CategoriaAleatoria", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      console.log(result);
      if (result.categorias && result.categorias.length > 0) {
        await setTodasCategorias(result.categorias);
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

  useEffect(() => {
    if (todasCategorias.length > 0) {
      iniciarJuego();
    }
  }, [todasCategorias]);

  function iniciarJuego() {
    const letrasDisponibles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letraAleatoria = letrasDisponibles[Math.floor(Math.random() * letrasDisponibles.length)];

    const categoriasSeleccionadas = seleccionarCategoriasAleatorias();

    setLetra(letraAleatoria);
    setCategorias(categoriasSeleccionadas);
    setRespuestas({});
    setTiempoRestante(120);
    setJuegoActivo(true);
  }

  function handleInputChange(categoria, valor) {
    setRespuestas((prev) => ({
      ...prev,
      [categoria]: valor,
    }));
  }

  function finalizarRonda() {
    setJuegoActivo(false);
    calcularPuntos();
  }

  function calcularPuntos() {
    let puntosRonda = 0;

    Object.entries(respuestas).forEach(([_, respuesta]) => {
      if (respuesta && respuesta.trim() !== "") {
        const primeraLetra = respuesta.trim()[0].toUpperCase();
        if (primeraLetra === letra) {
          puntosRonda += 10;
        } else {
          puntosRonda += 5;
        }
      }
    });

    setPuntos((prev) => prev + puntosRonda);
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
          puntos: puntos,
        }),
      });
      alert("¡Estadísticas guardadas!");
      router.push("/amigos");
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

    // Mostrar error si hay campos vacíos
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

  return (
    <div className={styles.gameContainer}>
      
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