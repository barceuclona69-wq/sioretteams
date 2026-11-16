import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';

function Listar() {
    const [sucursales, setSucursales] = useState([]);

    useEffect(() => {
        
         fetch(`${API_BASE_URL }/api/DARTIS/sucursales_dartis`)
            .then(res => res.json())
            .then(data => setSucursales(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Lista de Sucursales</h2>
            <table>
                <thead>
                    <tr><th>ID</th>
                    <th>Nombre</th></tr>
                </thead>
                <tbody>
                    {sucursales.map(suc => (
                        <tr key={suc.id}>
                            <td>{suc.id}</td>
                            <td>{suc.nombre}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default Listar;
