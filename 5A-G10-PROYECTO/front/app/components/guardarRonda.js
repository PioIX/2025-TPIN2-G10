
"use client"

export default function guardarRondaEnHistorial(snapshot) {
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
      }