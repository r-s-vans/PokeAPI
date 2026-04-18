import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [allPokemon, setAllPokemon] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [typeEff, setTypeEff] = useState({});
  const [loading, setLoading] = useState(true);
  const [typeJP, setTypeJP] = useState({}); // タイプの英語名→日本語名変換マップ


  useEffect(() => {
  const initApp = async () => {
    try {
      setLoading(true);
      //全ポケモンのリストを取得
      const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
      const data = await res.json();

      // 日本語名のリストを作成（エラーハンドリング付き）
      const listWithJP = await Promise.all(
        data.results.map(async (p) => {
          try {
            const detailRes = await fetch(p.url);
            const detail = await detailRes.json();
            const speciesRes = await fetch(detail.species.url);
            const species = await speciesRes.json();
            
            // 日本語名を探す（見つからない場合は英語名を代入）
            const nameObj = species.names.find(n => n.language.name === "ja-Hrkt" || n.language.name === "ja");
            const jaName = nameObj ? nameObj.name : p.name;
            
            return { ...p, jaName, id: detail.id };
          } catch (e) {
            // 個別のポケモンでエラーが出ても全体を止めない
            return { ...p, jaName: p.name, id: 0 };
          }
        })
      );
      setAllPokemon(listWithJP.filter(p => p.id !== 0));

      // 3. タイプ名の日本語マップを作成（エラーハンドリング付き）
      const tRes = await fetch("https://pokeapi.co/api/v2/type");
      const tData = await tRes.json();
      const tMap = {};
      
      await Promise.all(tData.results.map(async (t) => {
        if (t.name === "shadow" || t.name === "unknown") return;
        try {
          const res = await fetch(t.url);
          const data = await res.json();
          const typeNameObj = data.names.find(n => n.language.name === "ja-Hrkt" || n.language.name === "ja");
          tMap[t.name] = typeNameObj ? typeNameObj.name : t.name;
        } catch (e) {
          tMap[t.name] = t.name; // エラー時は英語名のまま
        }
      }));
      setTypeJP(tMap);

    } catch (e) {
      console.error("初期化エラー:", e);
    } finally {
      setLoading(false);
    }
  };
  initApp();
}, []);
 
 
  

  const calculateEffectiveness = async (types) => {
    const effectiveness = {};
    Object.keys(typeJP).forEach(t => effectiveness[t] = 1.0);

    for (const t of types) {
      const res = await fetch(t.type.url);
      const data = await res.json();
      const damage = data.damage_relations;

      damage.double_damage_from.forEach(item => effectiveness[item.name] *= 2);
      damage.half_damage_from.forEach(item => effectiveness[item.name] *= 0.5);
      damage.no_damage_from.forEach(item => effectiveness[item.name] *= 0);
    }
    setTypeEff(effectiveness);
  };

  if (loading) return <div className="loader">データを読み込み中...</div>;

  return (
    <div className="App">
      <header>
        <h1>タイプ相性チェッカー</h1>
        <p>ポケモンを選ぶと受けるダメージの倍率を表示します</p>
      </header>

      <div className="selector-container">
        <select onChange={(e) => handleSelect(e.target.value)}>
          <option value="">ポケモンを選択</option>
          {allPokemon.map(p => (
            <option key={p.id} value={p.url}>No.{p.id} {p.jaName}</option>
          ))}
        </select>
      </div>

      {selectedPokemon && (
        <div className="result-card">
          <div className="target-info">
            <img src={selectedPokemon.sprites.other["official-artwork"].front_default} alt={selectedPokemon.jaName} />
            <h2>{selectedPokemon.jaName}</h2>
            <div className="target-types">
              {selectedPokemon.types.map(t => (
                <span key={t.type.name} className={`type-badge ${t.type.name}`}>{typeJP[t.type.name]}</span>
              ))}
            </div>
          </div>

          <div className="eff-lists">
            <EffectSection title="4倍（致命的！）" val={4} data={typeEff} jp={typeJP} />
            <EffectSection title="2倍（弱点）" val={2} data={typeEff} jp={typeJP} />
            <EffectSection title="0.5倍（耐性）" val={0.5} data={typeEff} jp={typeJP} />
            <EffectSection title="0.25倍（強い耐性）" val={0.25} data={typeEff} jp={typeJP} />
            <EffectSection title="0倍（無効）" val={0} data={typeEff} jp={typeJP} />
          </div>
        </div>
      )}
    </div>
  );
}

// 倍率ごとの表示用サブコンポーネント
const EffectSection = ({ title, val, data, jp }) => {
  const filtered = Object.entries(data).filter(([_, m]) => m === val);
  if (filtered.length === 0) return null;
  return (
    <div className="eff-group">
      <h4>{title}</h4>
      <div className="type-grid">
        {filtered.map(([type]) => (
          <span key={type} className={`type-badge ${type}`}>{jp[type]}</span>
        ))}
      </div>
    </div>
  );
};

export default App;