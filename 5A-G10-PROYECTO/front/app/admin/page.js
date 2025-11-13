"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

import Input from "../components/Input";
import Button from "../components/Button";

export default function AdminPage() {
  const router = useRouter();
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [mailJugador, setMailJugador] = useState("");
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [categoriaParaPalabra, setCategoriaParaPalabra] = useState("");
  const [palabraEliminar, setPalabraEliminar] = useState("");
  const [categoriaEliminarPalabra, setCategoriaEliminarPalabra] = useState("");


  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };
  const borrarJugador = async () => {
    if (!mailJugador) {
      showModal("Error", "Por favor ingresa el mail del jugador");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/BorrarJugador", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: mailJugador }),
      });

      const result = await response.json();

      if (result.borrada) {
        showModal("Éxito", result.res || "Jugador y partidas eliminados correctamente");
        setMailJugador("");
      } else {
        showModal("Error", result.res || "No se pudo eliminar el jugador");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  

  const agregarPalabra = async () => {
    if (!nuevaPalabra || !categoriaParaPalabra) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/AgregarPalabra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palabra: nuevaPalabra,
          categoria: categoriaParaPalabra,
        }),
      });

      const result = await response.json();

      if (result.publicada) {
        showModal("Éxito", result.res);
        setNuevaPalabra("");
        setCategoriaParaPalabra("");
      } else {
        showModal("Error", result.res);
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };


  // Función para eliminar palabra
  const eliminarPalabra = async () => {
    if (!palabraEliminar || !categoriaEliminarPalabra) {
      showModal("Error", "Por favor ingresa la palabra y la categoría a eliminar");
      return;
    }

    try {
      const response = await fetch("http://localhost:4001/BorrarPalabra", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palabra: palabraEliminar, categoria: categoriaEliminarPalabra }),
      });

      const result = await response.json();

      if (result.success) {
        showModal("Éxito", result.message);
        setPalabraEliminar("");
        setCategoriaEliminarPalabra("");
      } else {
        showModal("Error", result.message || "No se pudo eliminar la palabra");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img src="/ingresar.png" alt="Panel Admin" className={styles.logo} />
        <h2 className={styles.subtitle}>¡Hola administrador!</h2>

        <Input
          type="email"
          placeholder="Mail del jugador a eliminar"
          value={mailJugador}
          onChange={(e) => setMailJugador(e.target.value)}
          className={styles.input}
        />
        <Button onClick={borrarJugador} className={styles.button}>
          ELIMINAR JUGADOR
        </Button>
        <Input
          placeholder="Nueva palabra"
          value={nuevaPalabra}
          onChange={(e) => setNuevaPalabra(e.target.value)}
          className={styles.input}
        />
        <Input
          placeholder="Categoría para la palabra"
          value={categoriaParaPalabra}
          onChange={(e) => setCategoriaParaPalabra(e.target.value)}
          className={styles.input}
        />
        <Button onClick={agregarPalabra} className={styles.button}>
          AGREGAR PALABRA
        </Button>

        <Input
          placeholder="Palabra a eliminar"
          value={palabraEliminar}
          onChange={(e) => setPalabraEliminar(e.target.value)}
          className={styles.input}
        />
        <Input
          placeholder="Categoría para la palabra a eliminar "
          value={categoriaEliminarPalabra}
          onChange={(e) => setCategoriaEliminarPalabra(e.target.value)}
          className={styles.input}
        />
        <Button onClick={eliminarPalabra} className={styles.button}>
          ELIMINAR PALABRA
        </Button>

        <div className={styles.buttonGroup}>
          <Button onClick={() => router.push("/lobby")} className={styles.buttonSecondary}>
            LOBBY
          </Button>
          <Button onClick={() => router.push("/ranking")} className={styles.buttonSecondary}>
            VER RANKING
          </Button>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage}>{modal.message}</p>
            <Button onClick={closeModal} className={styles.modalButton}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}