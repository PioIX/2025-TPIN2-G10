"use client"

export default function Input(props){
    return(
        <input 
            type={props.type || "text"} 
            onChange={props.onChange} 
            value={props.value}
            placeholder={props.placeholder}
            className={props.className}
            onKeyPress={props.onKeyPress}
            style={props.style}
        />
    )
}