# Proyecto Tutti Frutti

## Presupuesto

### Cosas para hacer:
- **Bocetos de las páginas**: Mantener una estética común para el trabajo. Los bocetos pueden ser realizados en [Canva](https://www.canva.com/).
- **Propuesta de la aplicación**: Definir la funcionalidad de la aplicación.
- **Propuesta de las tablas de la base de datos**: Incluir al menos una relación entre tablas.
- **Listado de tareas**: Definir tareas específicas para el desarrollo del trabajo, con al menos tres objetivos parciales para medir el avance del grupo y establecer fechas tentativas para su cumplimiento.
- **División de responsabilidades**: Asignar tareas a los integrantes del grupo. Todos los integrantes deben tener conocimiento sobre el trabajo completo.

## Propuesta del Juego

El juego es un **Tutti Frutti**. El jugador puede loguearse o registrarse. Al ingresar, el jugador puede elegir un contrincante/s (aparecerán los que están en línea, por ejemplo, en computadoras cercanas) y jugar contra ellos. Las categorías son seleccionadas al azar y las mismas para ambos jugadores. 

El que termine primero, presiona un botón y se verifica:
1. Si las palabras comienzan con la letra que se mencionó.
2. Si las palabras tienen sentido y son correctas.

El sistema determina los puntos de la siguiente forma:
- **5 puntos** si ambos jugadores pusieron la misma palabra.
- **10 puntos** si los jugadores pusieron palabras diferentes.
- **20 puntos** si uno de los jugadores no completó un campo o hizo la palabra mal.

El juego se registrará por **partidas ganadas**. La partida finaliza cuando los jugadores deciden o cuando se han utilizado todas las letras. **Si sobra tiempo**, se podrá retar a un amigo para jugar más tarde.

## Bocetos de la interfaz

Aquí están algunos bocetos de la interfaz del juego, creados en Canva:

![Boceto 1](https://github.com/user-attachments/assets/a64bd17d-2573-4821-9563-91548ce23e66)
![Boceto 2](https://github.com/user-attachments/assets/9ea1762b-8242-4597-9a90-e34f5fbd7c97)
![Boceto 3](https://github.com/user-attachments/assets/e7012a7d-2e57-4656-8eab-5da8c6d4618d)
![Boceto 4](https://github.com/user-attachments/assets/f9ab72f2-5595-4631-aaa2-e9de24933c65)
![Boceto 5](https://github.com/user-attachments/assets/face0291-b7f1-4df2-8bb7-d918da51c793)
![Boceto 6](https://github.com/user-attachments/assets/be01394d-55ff-4b23-b07f-ce3b5bb6c8d9)

## Tablas de la Base de Datos

### Jugadores
| Campo          | Tipo           |
|----------------|----------------|
| id_usuario     | INT            |
| nombre         | VARCHAR(100)    |
| mail           | VARCHAR(100)    |
| contraseña     | VARCHAR(100)    |
| partidas_jugadas | INT          |
| partidas_ganadas | INT          |
| partidas_perdidas | INT         |
| puntos         | INT            |
| administrador  | BOOLEAN        |

### Palabras
| Campo        | Tipo           |
|--------------|----------------|
| id           | INT            |
| palabra      | VARCHAR(100)    |
| categoria1   | VARCHAR(100)    |
| categoria2   | VARCHAR(100)    |

### Categorías
| Campo        | Tipo           |
|--------------|----------------|
| id           | INT            |
| nombre       | VARCHAR(100)    |

### Palabra_Categoria
| Campo        | Tipo           |
|--------------|----------------|
| idpalabra    | INT            |
| idcategoria  | INT            |


### Partidas
| Campo        | Tipo           |
|--------------|----------------|
| id           | INT            |
| jugador_id   | INT            |
| fecha        | DATETIME       |
| puntos       | INT            |
| resultado    | VARCHAR(50)    |

## Ejemplos de Categorías

- Nombres de Profesores
- Vegetal
- Fruta
- Animal
- Mundo
- Objetos
- Marcas
- Profesiones
- Colores
- Películas
- Series
- Partes del Cuerpo

## Listado de Tareas

### Tareas y Responsabilidades
- **DER y base de datos**: Sofi
- **Registro y login**: Sofi
- **Pedidos del backend**: Chiara
- **Funciones**: Todos
- **Styles e interfaz de usuario**: Mombe
- **Socket**: Chiara
- **Selección aleatoria de categorías**: Todos
- **Validación de palabras** (comprobar si son correctas y si comienzan con la letra correcta): Todos
- **Partidas nuevas sin cerrar sesión y que no se repitan las categorías**: Todos
- **Guardar en la base de datos las partidas jugadas, ganadas, perdidas y puntos**: Todos
- **Administrador puede borrar categorías y jugadores**: Sofi
- **Ranking de jugadores**: Chiara y Sofi


