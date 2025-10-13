"use client";

import { useState } from "react";

export default function RegistroYLogin() {
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [mail, setMail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [puntos, setPuntos] = useState(0);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });

  const showModal = (title, message) => {
    setModal({ open: true, title, message });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  async function ingresar() {
    if (!mail || !contraseña) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    const datosLogin = {
      mail: mail,
      contraseña: contraseña,
    };

    try {
      const response = await fetch("http://localhost:4001/LoginJugadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosLogin),
      });

      const result = await response.json();
      console.log(result);

      if (result.loguea) {
        showModal("Éxito", "¡Has iniciado sesión correctamente!");
        // Aquí guardarías el ID en memoria o estado global en lugar de localStorage
        // router.push("/home");
      } else {
        showModal("Error", result.res || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor.");
    }
  }

  async function registrar() {
    if (!nombre || !mail || !contraseña) {
      showModal("Error", "Por favor completa todos los campos");
      return;
    }

    if (contraseña !== confirmPassword) {
      showModal("Error", "Las contraseñas no coinciden");
      return;
    }

    const datosRegistro = {
      nombre: nombre,
      mail: mail,
      contraseña: contraseña,
      puntos: puntos,
      administrador: false,
    };

    console.log(datosRegistro);

    try {
      const response = await fetch("http://localhost:4001/RegistroJugadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosRegistro),
      });

      const result = await response.json();
      console.log(result);

      if (result.registro) {
        showModal("Éxito", "¡Usuario registrado correctamente!");
        setTimeout(() => {
          setModo("login");
          setNombre("");
          setMail("");
          setContraseña("");
          setConfirmPassword("");
        }, 1500);
      } else {
        showModal("Error", result.res || "No se pudo registrar el usuario");
      }
    } catch (error) {
      console.error(error);
      showModal("Error", "Hubo un problema con la conexión al servidor.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-300">
      <div className="w-full max-w-md px-8 py-12 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl">
        <h1 className="text-6xl font-bold text-center mb-8 tracking-wide" style={{
          background: 'linear-gradient(to right, #FF6B6B, #FFA500, #FFD700, #4ECDC4, #45B7D1, #A78BFA, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          Ingresar
        </h1>

        {modo === "login" ? (
          <div className="space-y-4">
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="email"
              placeholder="Mail"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="password"
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
            />
            
            <div className="flex gap-4 pt-4">
              <button 
                className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all uppercase"
                onClick={ingresar}
              >
                Iniciar sesión
              </button>
              <button 
                className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all uppercase"
                onClick={() => setModo("registro")}
              >
                Registrarse
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="email"
              placeholder="Mail"
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="password"
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
            />
            <input
              className="w-full px-6 py-3 rounded-full border-2 border-gray-300 focus:border-blue-400 focus:outline-none text-gray-700 placeholder-gray-400 transition-all"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            
            <div className="flex gap-4 pt-4">
              <button 
                className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all uppercase"
                onClick={registrar}
              >
                Registrarse
              </button>
              <button 
                className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all uppercase"
                onClick={() => setModo("login")}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{modal.title}</h2>
            <p className="text-gray-600 mb-6">{modal.message}</p>
            <button
              className="w-full py-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 text-white font-bold hover:shadow-lg transform hover:scale-105 transition-all"
              onClick={closeModal}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}