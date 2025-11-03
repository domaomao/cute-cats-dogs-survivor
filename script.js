body {
  margin: 0;
  background: linear-gradient(135deg, #fbd3e9 0%, #fccde2 100%);
  font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', Arial, sans-serif;
  touch-action: manipulation;
}
.screen {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.hidden { display: none !important; }

h1, h2 {
  color: #f58ecb;
  text-shadow: 1px 1px 10px #fccde2;
}

button {
  background: #fa99d6;
  color: #fff;
  border: none;
  border-radius: 10px;
  box-shadow: 0 0 8px #fccde2;
  font-size: 1.2em;
  padding: 10px 40px;
  margin: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover {
  background: #f31c86;
}

#gameUI {
  z-index: 1;
}
#gameCanvas {
  box-shadow: 0 0 32px 12px #fccde2;
  border-radius: 16px;
  background: #fff0fa;
  margin: 0 auto;
  display: block;
}
#hud {
  position: absolute;
  top: 10px; left: 10px;
  display: flex; gap: 36px;
  align-items: center;
  font-size: 1.2em; color: #f58ecb;
  text-shadow: 1px 1px 8px #fff;
  z-index: 3;
}
#expbar {
  display: inline-block;
  width: 120px; height: 18px;
  background: #fff;
  border: 2px solid #fa99d6;
  border-radius: 12px;
  margin-left: 6px;
  box-shadow: 0 0 6px #fa99d6;
  vertical-align: middle;
  overflow: hidden;
}
#expval {
  background: linear-gradient(90deg, #fb7eeb 0%, #ff90c4 100%);
  display: inline-block;
  height: 100%;
  border-radius: 12px;
}

#levelupBox {
  position: absolute;
  left: 50%; top: 48%;
  transform: translate(-50%, -50%);
  background: #fff7fa;
  border: 3px solid #fa99d6;
  padding: 42px;
  border-radius: 16px;
  box-shadow: 0 0 22px #fa99d6;
  text-align: center;
  z-index: 20;
}
#levelupChoices button {
  margin: 12px 18px;
  font-size: 1.1em;
}

#gameOverBox {
  position: absolute;
  left: 50%; top: 48%;
  transform: translate(-50%, -50%);
  background: #fff7fa;
  border: 3px solid #fa99d6;
  padding: 42px;
  border-radius: 16px;
  box-shadow: 0 0 22px #fa99d6;
  text-align: center;
  z-index: 25;
  color: #f31c86;
}

@media (max-width: 600px) {
  #gameCanvas {
    width: 98vw !important;
    height: 60vw !important;
    min-height: 300px !important;
    min-width: 200px !important;
    margin-top: 8vw;
  }
  #levelupBox, #gameOverBox {
    width: 90vw;
    max-width: none;
    padding: 16vw 2vw;
  }
  #menu, #gameUI {
    font-size: 1.12em;
  }
}
