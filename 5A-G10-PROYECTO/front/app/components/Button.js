"use client"

export default function Button(props){
    return (
        <button 
          onClick={props.funcionalidad || props.onClick} 
          className={props.className}
          style={props.style}
        >
          {props.texto || props.text || props.children}
        </button>
    )
}