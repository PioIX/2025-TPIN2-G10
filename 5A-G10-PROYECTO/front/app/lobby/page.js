"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";
import styles from "./page.module.css";
import { useSocket } from "../../hook/useSocket";


export default function Amigos() {
  const [amigos, setAmigos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const [solicitudAmistadPendiente, setSolicitudAmistadPendiente] = useState(null);
  const [idLogged, setIdLogged] = useState(null);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [registrado, setRegistrado] = useState(false);
  const [modalMensaje, setModalMensaje] = useState(null);
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const showModal = (title, message) => {
    setModal({ open: true, title, message });

  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };
  useEffect(() => {
    
    const id = localStorage.getItem("idLogged");
    if (id) {
      setIdLogged(id);
    }

    showModal(
      "REGLAS DEL JUEGO:",
      "• Escribir sin tildes\n• Escribir palabras acordes a la categoría, si no no serán validadas"
    );

    cargarAmigos();
    cargarNombreUsuario();
  }, []);

  useEffect(() => {
    if (!socket || !idLogged || !isConnected) return;

    console.log('Se está registrando', idLogged);
    socket.emit('registerUser', idLogged);

    socket.on('registrationConfirmed', (data) => {
      console.log('Se registró', data);
      setRegistrado(true);
    });

    socket.on('friendRequestReceived', (data) => {
      console.log("Solicitud de amistad recibida", data);
      setSolicitudAmistadPendiente(data);
    });

    socket.on('friendRequestSent', (data) => {
      setModalMensaje({ tipo: 'success', mensaje: data.message });
    });
    socket.on('friendAdded', (data) => {
      setModalMensaje({ tipo: 'success', mensaje: data.message });
      if (data.shouldReload) {
        cargarAmigos();
      }
    });

    socket.on('friendRemoved', (data) => {
      setModalMensaje({ tipo: 'info', mensaje: data.message });
      if (data.shouldReload) {
        cargarAmigos();
      }
    });

    socket.on('gameRequest', (data) => {
      console.log("Recibió la solicitud de juego", data);
      setSolicitudPendiente(data);
    });

    socket.on('requestSent', (data) => {
      console.log('Se envió la solicitud', data.message);
      setModalMensaje({ tipo: 'info', mensaje: data.message });
    });

    socket.on('gameStarted', (data) => {
      console.log("Empezó el juego", data);
      setModalMensaje({
        tipo: 'success',
        mensaje: '¡El juego está comenzando!',
        redirect: `/juego?room=${data.room}&categorias=${JSON.stringify(data.categorias)}&letra=${data.letra}`
      });
    });

    socket.on('gameRejected', (data) => {
      setModalMensaje({ tipo: 'error', mensaje: data.message });
    });

    socket.on('userOffline', (data) => {
      setModalMensaje({ tipo: 'error', mensaje: data.message });
    });

    return () => {
      socket.off('registrationConfirmed');
      socket.off('friendRequestReceived');
      socket.off('friendRequestSent');
      socket.off('gameRequest');
      socket.off('requestSent');
      socket.off('gameStarted');
      socket.off('gameRejected');
      socket.off('userOffline');
    };
  }, [socket, idLogged, isConnected]);

  async function cargarNombreUsuario() {
    const idLogged = localStorage.getItem("idLogged");

    if (!idLogged) {
      router.push("/");
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

  async function cargarAmigos() {
    const idLogged = localStorage.getItem("idLogged");

    if (!idLogged) {
      router.push("/registroYlogin");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4001/Amigos?idjugador=${idLogged}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (result.amigos && result.amigos.length > 0) {
        setAmigos(result.amigos);
      } else {
        setAmigos([]);
      }
    } catch (error) {
      console.error("Error al obtener amigos:", error);
    }
  }

  async function envioSolicitudJuego(amigo) {
    socket.emit('sendGameRequest', {
      idSolicitante: parseInt(idLogged),
      nombreSolicitante: nombreUsuario,
      idReceptor: parseInt(amigo.idusuario),
      nombreReceptor: amigo.nombre
    });
  }

  function aceptarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('acceptGameRequest', {
      idSolicitante: parseInt(solicitudPendiente.idSolicitante),
      idReceptor: parseInt(idLogged)
    });

    setSolicitudPendiente(null);
  }

  function rechazarSolicitud() {
    if (!solicitudPendiente) return;

    socket.emit('rejectGameRequest', {
      idSolicitante: parseInt(solicitudPendiente.idSolicitante),
      nombreReceptor: nombreUsuario
    });

    setSolicitudPendiente(null);
  }

  // FUNCIONES PARA SOLICITUD DE AMISTAD
  async function aceptarSolicitudAmistad() {
    if (!solicitudAmistadPendiente) return;

    try {
      const response = await fetch("http://localhost:4001/AgregarAmigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idjugador: parseInt(idLogged),
          idamigo: parseInt(solicitudAmistadPendiente.idSolicitante)
        })
      });

      const result = await response.json();

      if (result.agregado) {
        setModalMensaje({ tipo: 'success', mensaje: '¡Solicitud de amistad aceptada!' });
        cargarAmigos();
      } else {
        setModalMensaje({ tipo: 'error', mensaje: result.res });
      }
    } catch (error) {
      console.error("Error al aceptar solicitud:", error);
    }

    setSolicitudAmistadPendiente(null);
  }

  function rechazarSolicitudAmistad() {
    setSolicitudAmistadPendiente(null);
    setModalMensaje({ tipo: 'info', mensaje: 'Solicitud de amistad rechazada' });
  }

  async function cargarUsuariosDisponibles() {
    const idLogged = localStorage.getItem("idLogged");

    try {
      const response = await fetch(
        `http://localhost:4001/UsuariosDisponibles?idjugador=${idLogged}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (result.usuarios) {
        setUsuariosDisponibles(result.usuarios);
      }
    } catch (error) {
      console.error("Error al obtener usuarios disponibles:", error);
    }
  }

  async function enviarSolicitudAmistad(usuario) {
    socket.emit('sendFriendRequest', {
      idSolicitante: parseInt(idLogged),
      nombreSolicitante: nombreUsuario,
      idReceptor: parseInt(usuario.idusuario)
    });

    setMostrarModal(false);
  }

  function abrirModalUsu() {
    setMostrarModal(true);
    cargarUsuariosDisponibles();
  }

  async function eliminarAmigo(idAmigo) {
    const idLogged = localStorage.getItem("idLogged");

    try {
      const response = await fetch("http://localhost:4001/EliminarAmigo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idjugador: parseInt(idLogged),
          idamigo: parseInt(idAmigo)
        })
      });

      const result = await response.json();

      if (result.eliminado) {
        setModalMensaje({ tipo: 'success', mensaje: result.res });
        cargarAmigos();
      } else {
        setModalMensaje({ tipo: 'error', mensaje: result.res || "No se pudo eliminar el amigo" });
      }
    } catch (error) {
      console.error("Error al eliminar amigo:", error);
      setModalMensaje({ tipo: 'error', mensaje: 'Error al eliminar amigo' });
    }
  }

  function cerrarModalMensaje() {
    if (modalMensaje?.redirect) {
      router.push(modalMensaje.redirect);
    }
    setModalMensaje(null);
  }




  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>
            ¡Hola, <span className={styles.nombreDestacado}>{nombreUsuario}</span>!
          </span>
        </div>
        <span className={styles.connectionStatus}>
          {isConnected && registrado ? "En línea" : "Desconectado"}
        </span>
      </div>

      <div className={styles.amigosTable}>
        <div className={styles.tableHeader}>
          <h2>Amigos</h2>
          <button
            className={styles.addButton}
            onClick={abrirModalUsu}
          >
            +
          </button>
        </div>

        <div className={styles.amigosList}>
          {amigos.length > 0 ? (
            amigos.map((amigo) => (
              <div key={amigo.idusuario} className={styles.amigoItem}>
                <div className={styles.amigoInfo}>
                  <span className={styles.amigoNombre}>{amigo.nombre}</span>
                </div>
                <div className={styles.amigoActions}>
                  <Button
                    texto="JUGAR"
                    className={styles.jugarButton}
                    onClick={() => envioSolicitudJuego(amigo)}
                  />
                  <Button
                    texto="ELIMINAR"
                    className={styles.eliminarButton}
                    onClick={() => eliminarAmigo(amigo.idusuario)}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noAmigos}>No tienes amigos agregados</p>
          )}
        </div>
      </div>

      {mostrarModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setMostrarModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Enviar Solicitud de Amistad</h3>
              <Button
                texto="×"
                className={styles.closeButton}
                onClick={() => setMostrarModal(false)}
              />
            </div>

            <div className={styles.usuariosLista}>
              {usuariosDisponibles.length > 0 ? (
                usuariosDisponibles.map((usuario) => (
                  <div key={usuario.idusuario} className={styles.usuarioItem}>
                    <div className={styles.usuarioInfo}>
                      <span className={styles.usuarioNombre}>
                        {usuario.nombre}
                      </span>
                      <span className={styles.usuarioMail}>
                        {usuario.mail}
                      </span>
                    </div>
                    <Button
                      texto="Enviar solicitud"
                      className={styles.btnAgregar}
                      onClick={() => enviarSolicitudAmistad(usuario)}
                    />
                  </div>
                ))
              ) : (
                <p className={styles.noUsuarios}>
                  No hay usuarios disponibles
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {solicitudAmistadPendiente && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Solicitud de Amistad</h3>
            </div>

            <div className={styles.solicitudContent}>
              <p className={styles.solicitudTexto}>
                <strong>{solicitudAmistadPendiente.nombreSolicitante}</strong> quiere ser tu amigo
              </p>

              <div className={styles.solicitudBotones}>
                <Button
                  texto="Aceptar"
                  className={styles.btnAceptar}
                  onClick={aceptarSolicitudAmistad}
                />
                <Button
                  texto="Rechazar"
                  className={styles.btnRechazar}
                  onClick={rechazarSolicitudAmistad}
                />

              </div>
            </div>
          </div>
        </div>
      )}

      {solicitudPendiente && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Solicitud de Juego</h3>
            </div>

            <div className={styles.solicitudContent}>
              <p className={styles.solicitudTexto}>
                <strong>{solicitudPendiente.nombreSolicitante}</strong> quiere jugar una super partida de Tutti Frutti con vos!
              </p>

              <div className={styles.solicitudBotones}>
                <Button
                  texto="Aceptar"
                  className={styles.btnAceptar}
                  onClick={aceptarSolicitud}
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

      {modalMensaje && (
        <div className={styles.modalOverlay} onClick={cerrarModalMensaje}>
          <div
            className={`${styles.modalContent} ${styles.modalMensajeContent}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalMensajeHeader}>
              <div className={`${styles.modalMensajeIcono} ${styles[`icono${modalMensaje.tipo.charAt(0).toUpperCase() + modalMensaje.tipo.slice(1)}`]}`}>
                {modalMensaje.tipo === 'success' && '✓'}
                {modalMensaje.tipo === 'error' && '✕'}
                {modalMensaje.tipo === 'info' && 'i'}
              </div>
            </div>

            <div className={styles.modalMensajeBody}>
              <p className={styles.modalMensajeTexto}>{modalMensaje.mensaje}</p>
            </div>

            <div className={styles.modalMensajeFooter}>
              <Button
                texto="Aceptar"
                className={`${styles.btnModalMensaje} ${styles[`btn${modalMensaje.tipo.charAt(0).toUpperCase() + modalMensaje.tipo.slice(1)}`]}`}
                onClick={cerrarModalMensaje}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.bottomButtons}>
        <Button
          texto="RANKING"
          className={styles.buttonPink}
          onClick={() => router.push("/ranking")}
        />
        <Button
          texto="HISTORIAL"
          className={styles.buttonYellow}
          onClick={() => router.push("/historial")}
        />
        <Button
          texto="CERRAR SESIÓN"
          className={styles.buttonRed}
          onClick={() => {
            localStorage.removeItem("idLogged");
            router.push("/registroYlogin");
          }}
        />
      </div>
      {modal.open && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage} style={{ whiteSpace: 'pre-line' }}>{modal.message}</p>
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