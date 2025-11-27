// src/pages/Constructor.jsx
import "./Constructor.css";
import CakeConstructor2D from '../components/CakeConstructor2D';
import { useLocation } from 'react-router-dom';

export default function Constructor() {
  const location = useLocation();
  const designId = new URLSearchParams(location.search).get('designId');

  return (
    <div className="container ctor">
      <div className="title-major">
        <div className="over">Tailor-made</div>
        <h2>PersonalizeazÄƒ tortul — Constructor 2D</h2>
      </div>

      <div style={{ marginTop: 16 }}>
        <CakeConstructor2D designId={designId} />
      </div>
    </div>
  );
}

