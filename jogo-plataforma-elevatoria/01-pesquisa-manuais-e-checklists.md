# Jogo da Plataforma Elevatória: pesquisa de manuais e checklists

> Fase 1 do projeto: base técnica. Os números servem como **referência para o jogo**. Na vida real vale sempre o manual do fabricante do modelo usado e a norma vigente.

---

## 1. Normas e documentos de referência

| Documento | O que traz | Uso no jogo |
|---|---|---|
| **NR-18** (texto consolidado gov.br, item 18.12 "Andaimes e plataformas de trabalho") | PEMT deve seguir o manual do fabricante quanto a operação, manutenção e inspeções. O operador precisa ser **capacitado** (Anexo I: carga horária e conteúdo) e treinado no modelo usado. Exige inspeção diária do local e teste visual e funcional antes do uso ou no início do turno. | Tela de "habilitação" do operador e checklist obrigatório antes de cada fase |
| **NR-35** (Trabalho em Altura) | Treinamento, análise de risco, permissão de trabalho, plano de resgate | Fase de APR/Permissão de Trabalho e plano de resgate |
| **ABNT NBR 16776** | Requisitos de segurança para PEMT | Referência técnica |
| **IPAF**: Lista de Verificação Pré-Uso PEMT/PTA (TE-1049-PT) | Checklist completo com 43 itens (seção 4) | Base do minigame de checklist |
| **IPAF**: Conversa de caixa de ferramentas, Inspeção Pré-Uso | O que fazer antes e depois da inspeção, o que fazer se houver defeito, EPI | Regras de falha e bloqueio da máquina |
| **Manual do operador Genie GS-1930** (tesoura elétrica) | Regras de segurança, limites numéricos, testes de função, painéis de comando | **Modelo de referência do tipo padrão (tesoura)** |
| **Genie AerialPros**: classificação de vento | Limite de 12,5 m/s, efeito vela | Sistema de vento |
| **ANSI A92 / OSHA** | Inspeção antes de cada turno, riscos de queda, tombamento, eletrocussão | Riscos das fases |

---

## 2. Tipos de plataforma (seleção no jogo)

Classificação ISO/IPAF: **Grupo A** (o centro da plataforma fica dentro da base) e **Grupo B** (a plataforma pode sair da base). **Tipo 1** (só se desloca recolhida), **Tipo 3** (se desloca elevada, com comando na plataforma).

| # | Tipo | Categoria IPAF | Característica | No jogo |
|---|---|---|---|---|
| **1** | **Tesoura (vertical, não articulada)**: **PADRÃO** | 3a (A3) | Sobe na vertical, anda elevada em velocidade reduzida, muito sensível a desnível | **Default.** Fases iniciais |
| 2 | Mastro vertical / tipo pessoal | 1a / 3a | Compacta, uso interno, capacidade baixa | Desbloqueável |
| 3 | Lança telescópica (reta) | 3b (B3) | Lança reta, gira, grande alcance horizontal | Desbloqueável |
| 4 | Lança articulada | 3b (B3) | Contorna obstáculos com "cotovelo" e jib | Desbloqueável (avançado) |
| 5 | Sobre caminhão / cesto aéreo | 1b | Exige patolas | Opcional (futuro) |

---

## 3. Parâmetros técnicos do tipo padrão (tesoura, ref. Genie GS-1930)

| Parâmetro | Valor de referência | Mecânica no jogo |
|---|---|---|
| Capacidade, plataforma recolhida | **227 kg** | Barra de carga. Acima disso a plataforma não sobe (sensor de sobrecarga) |
| Capacidade, extensão aberta | **113 kg** | Capacidade cai ao abrir o deck extensível |
| Ocupantes máximos | **2** | Limite de NPCs a bordo |
| Força lateral máxima | ~445 N | Empurrar ou puxar material na altura gera penalidade |
| Vento máximo (uso externo) | **12,5 m/s (45 km/h, 28 mph)** | Acima disso é proibido subir. Se já estiver elevado: **descer e parar** |
| Modelos "uso interno" | **0 m/s** (não pode usar com vento) | Tipo "elétrica interna" bloqueada em fases externas |
| Rampa máxima (só recolhida) | **25% (≈14°)** | Rampa no mapa: acima disso a máquina não sobe e precisa de guincho ou transporte |
| Nível para elevar | Superfície **firme e nivelada** (típico ≈1,5° a 2° no sensor) | Medidor de inclinação. Fora do limite, a plataforma trava |
| Alarme de inclinação | 180 bipes/min, display "LL", a plataforma para e não anda | Efeito sonoro e bloqueio |
| Alarme de descida | 60 bipes/min durante a descida | Som |
| Protetor de buraco (pothole guard) | Desce sozinho a ~1,2 m de altura. Se não descer, alarme e sem tração | Item de checklist e falha aleatória |
| Velocidade recolhida | 4,0 km/h | Velocidade de deslocamento |
| Velocidade elevada | **0,8 km/h** (teste: ≤ 22 cm/s) | Ao elevar, a velocidade cai automaticamente |
| Teste de inclinação | Calço (2x4) sob as rodas de um lado, elevar ~2,1 m: deve parar e alarmar | Minigame de teste de função |
| Teste de descida de emergência | Elevar ~60 cm e puxar o botão de descida de emergência | Minigame |
| Timeout do botão de função | **7 s** sem acionar o joystick | Precisa reapertar o "enable" |
| Bateria | Carregador máx. 24 V, não carregar na chuva nem em área explosiva | Gestão de bateria |

### Distância mínima de rede elétrica (máquina NÃO é isolada)

| Tensão | Distância mínima |
|---|---|
| 0–50 kV | **3,05 m** |
| 50–200 kV | 4,60 m |
| 200–350 kV | 6,10 m |
| 350–500 kV | 7,62 m |
| 500–750 kV | 10,67 m |
| 750–1000 kV | 13,72 m |

Considerar o balanço e a flecha do cabo. Em caso de contato: **ninguém toca na máquina** até desligarem a rede. Não operar com raio ou tempestade.

### Escala de vento para o jogo (Beaufort)

| Beaufort | m/s | km/h | Situação no jogo |
|---|---|---|---|
| 0–3 | 0–5,4 | 0–19 | Verde: operação normal |
| 4 | 5,5–7,9 | 20–28 | Verde: plataforma balança levemente |
| 5 | 8,0–10,7 | 29–38 | Amarelo: atenção, nada de painel ou chapa (efeito vela) |
| 6 | 10,8–13,8 | 39–49 | **Vermelho a partir de 12,5 m/s: descer e parar** |
| 7+ | ≥13,9 | ≥50 | Proibido operar |

Regras extras de vento:
- O vento **na altura é maior** que no solo. O anemômetro do jogo mostra os dois valores.
- **Rajadas** contam: o limite vale para a rajada, não para a média.
- **Efeito vela**: carregar placa, vidro, chapa, compensado ou faixa aumenta a área exposta e reduz a estabilidade. Não é permitido aumentar a área da plataforma (banners, lonas).

---

## 4. Checklist pré-uso (IPAF TE-1049-PT, adaptado)

Regra base: *todas as verificações conforme o manual do fabricante*. **Qualquer falha marcada com X: máquina não opera, comunicar o supervisor.**

### A. Documentação
1. Inspeção obrigatória / periódica em dia (NR-18 cita horímetro e periodicidade de 12 meses)
2. Manual do operador do fabricante na máquina (e o nº de série confere com a placa)
3. Plano de resgate no local e pessoa de resgate no solo identificada

### B. Verificações visuais
**Rodas/pneus**
4. Sem parafusos, porcas e retentores soltos ou danificados
5. Pressão dos pneus (pneumático, espuma ou maciço)
6. Condição: sem cortes, rachaduras, lona exposta, aros danificados

**Motor/fonte de energia**
7. Níveis de fluidos (óleo do motor, arrefecimento, combustível) *(em máquinas a combustão)*
8. Sem vazamento no solo ou no motor
9. Bateria: eletrólito, conexões, terminais, plugue de segurança, carga

**Hidráulica**
10. Nível de fluido hidráulico
11. Sem vazamentos (mangueiras, tubos, cilindros, válvulas)

**Mangueiras e cabos**
12. Fixação e estado (sem cortes, fissuras)
13. Bandejas de cabos livres de danos e detritos

**Extensores/estabilizadores**
14. Estado geral, pinos/retentores, sapatas
15. Placas de distribuição presentes e em bom estado
16. Bloqueios funcionando

**Chassi, lança e tesoura**
17. Condição geral: sem danos, desalinhamento ou corrosão
18. Sem trincas de solda
19. Pinos, retentores e correntes em bom estado
20. Coberturas, proteções e tampas
21. Degraus de acesso seguros e limpos

**Plataforma**
22. Portão/corrente de entrada, guarda-corpos e pinos de retenção
23. Pontos de ancoragem do cinto/talabarte
24. Livre de lixo, detritos e obstruções
25. Proteção secundária (anti-esmagamento, se houver)

**Decalques e sinalização**
26. Placa de identificação/conformidade e decalques legíveis
27. Comandos com setas direcionais visíveis (azul/amarela)
28. Carga (SWL), vento máximo e nº de pessoas marcados

### C. Verificações de função (no comando do Solo **(S)** e da Plataforma **(P)**)
29. Dispositivo de segurança (chave isoladora, teclado, cartão)
30. Função de ativação (chave, pedal, botão "enable" de manter pressionado)
31. **Parada de emergência** e **descida de emergência/auxiliar** funcionando
32. Todos os botões e comandos movem livremente e voltam ao neutro
33. Funções de elevação (subir, descer; girar e telescopar nas lanças)
34. Funções de deslocamento (frente, ré, direção, **freios**)
35. Velocidade reduzida ativa quando elevada
36. Luzes, giroflex, dispositivos de aviso
37. Alarmes sonoros (inclinação, descida, deslocamento)
38. Interruptores de limite (descida, sobrecarga SWL, alcance, giro)
39. **Protetor de buraco** (desce e recolhe)
40. Eixo oscilante e eixos extensíveis
41. Acessórios, tomada na plataforma, deck extensível
42. Calços de segurança (braço de segurança da tesoura), estabilizadores, nivelamento
43. Proteção secundária (função e reset)

### Itens específicos da tesoura (manual Genie)
- Bandejas do chassi (baterias/hidráulico) **fechadas e travadas** antes de elevar ou andar
- Guarda-corpos laterais instalados e aparafusados
- **Braço de segurança** acionado antes de qualquer inspeção embaixo da tesoura
- Chave de 3 posições: Plataforma / Desligado / Solo
- Fio terra (ground strap) e almofadas de desgaste (wear pads)

### Se encontrar defeito (IPAF)
1. Isolar a máquina, **retirar a chave** e acionar a **parada de emergência**
2. **Etiquetar** ("FORA DE USO") para avisar os outros operadores
3. Comunicar o supervisor. Reparo só por técnico qualificado. Depois **refazer inspeção e testes**

---

## 5. Inspeção do local de trabalho (antes de levar a máquina)

- Desníveis, bordas e buracos (poços, valas, ralos sem tampa)
- Lombadas, obstáculos no piso, detritos
- Superfícies inclinadas
- Piso instável ou escorregadio (terra solta, lama, óleo, gelo)
- Capacidade do piso para a carga (laje, tampas, piso elevado)
- Obstáculos aéreos (vigas, tubulações, pontes rolantes travadas?)
- **Redes elétricas** (ver tabela de distâncias)
- Vento e clima (chuva, raios)
- Pessoas não autorizadas: isolar a área com cones e fita
- Locais perigosos ou explosivos
- Trânsito de veículos e empilhadeiras

---

## 6. Regras de operação (viram "infrações" no jogo)

**Tombamento**
- Só elevar em piso firme e nivelado. Não andar elevado perto de buraco, desnível ou terreno irregular
- Não exceder carga nem nº de pessoas. Acessórios reduzem a capacidade
- Não usar como guindaste, não empurrar objetos, não amarrar em estruturas, carga sempre dentro do guarda-corpo
- Não aumentar a área exposta ao vento

**Queda**
- Entrar e sair **só com a plataforma recolhida**. Portão fechado antes de operar
- Não subir, sentar ou ficar de pé no guarda-corpo. **Não colocar escada nem andaime na plataforma**
- Cinto paraquedista com talabarte no ponto de ancoragem, quando exigido pelo local/APR (obrigatório em lanças, conforme a IPAF)

**Colisão e esmagamento**
- Atenção a pontos cegos e obstáculos aéreos. Velocidade compatível com o piso
- Mãos fora da tesoura. Não descer a plataforma com gente embaixo
- Sem "brincadeiras" ou manobras arriscadas

**Lesões**
- Não operar com vazamento hidráulico (o jato perfura a pele)
- Não ser usada como aterramento de solda

**EPI mínimo (IPAF):** capacete com jugular, óculos, luvas e calçado de segurança. Na lança: cinto com talabarte curto.

---

## 7. Comandos da tesoura (referência real) e proposta de controles

### Comandos reais (Genie GS)
- **Painel do solo:** chave 3 posições, **Emergência (vermelho)**, botão "enable" de elevação, Subir, Descer, disjuntor, display LCD
- **Painel da plataforma:** **Emergência**, buzina, seleção de velocidade lenta/rápida, botão Elevação/Deslocamento, **joystick proporcional com gatilho "enable"** (seta azul = um sentido, amarela = outro), botão basculante de direção (polegar), display LED de bateria e diagnóstico
- **Descida de emergência:** botão/manopla no chassi (sem alarme de descida)

### Mapeamento proposto

| Ação | Teclado | Controle PS5 (DualSense) |
|---|---|---|
| Andar / joystick proporcional | W/S | Analógico esquerdo (vertical) |
| Direção (esquerda/direita) | A/D | Analógico esquerdo (horizontal) |
| **Enable (homem-morto), segurar** | **Shift esquerdo** | **L2 / R2** (gatilho adaptativo) |
| Subir plataforma | ↑ / R | R1 |
| Descer plataforma | ↓ / F | L1 |
| Alternar Elevação ↔ Deslocamento | Tab | △ |
| Velocidade lenta/rápida | Q | ○ |
| Buzina | H | ✕ |
| **PARADA DE EMERGÊNCIA** | **Espaço** | **□** |
| Descida de emergência (no solo) | E (segurar) | Touchpad (pressionar) |
| Checklist / prancheta | C | Options |
| Pausa / menu | Esc | PS / Create |
| Câmera | Mouse / setas | Analógico direito |
| Prender talabarte | T | R3 |

Ideias para o DualSense: **vibração** ao chegar perto do limite de vento ou inclinação, **gatilho adaptativo** com resistência no "enable", **LED da barra de luz** verde/amarelo/vermelho conforme o risco.

---

## 8. Esboço de fases

| Fase | Tema | O que treina |
|---|---|---|
| 0 | Habilitação | Quiz NR-18/NR-35, escolha do EPI |
| 1 | Galpão (interno) | **Checklist pré-uso completo** e testes de função |
| 2 | Piso irregular | Inspeção do local, buracos, protetor de buraco, inclinômetro |
| 3 | Rampa | Subir rampa só recolhida (≤25%/14°), calços |
| 4 | Fachada externa | **Vento**: anemômetro, rajadas, efeito vela com placas |
| 5 | Carga | Peso e nº de pessoas, deck extensível com capacidade reduzida |
| 6 | Rede elétrica | Distâncias mínimas por tensão |
| 7 | Tempestade | Decisão de descer e parar, falha e descida de emergência |
| 8 | Resgate | Plano de resgate e comando do solo |
| 9+ | Lança telescópica/articulada | Giro, alcance, talabarte obrigatório |

Pontuação sugerida: **segurança** (infrações = penalidade grave ou falha da fase), **tempo** e **qualidade do checklist** (itens defeituosos "escondidos" que o jogador precisa encontrar).

---

## Fontes
- IPAF, [Lista de Verificação de Inspeção Pré-Uso de PEMT/PTA (TE-1049-PT)](https://www.ipaf.org/sites/default/files/2025-02/LISTA%20DE%20VERIFICA%C3%87%C3%83O%20DE%20INSPE%C3%87%C3%83O%20PR%C3%89-USO%20DE%20PEMT%20PTA%20TE-1049-PT--V3.0-20250206.pdf)
- IPAF, [Conversa de Caixa de Ferramentas: Inspeção Pré-Uso](https://www.ipaf.org/sites/default/files/2025-01/PT%20-%20IPAF%20Toolbox%20Talk%20A3%20-%20MEWP%20Pre-Use%20Inspection.pdf)
- IPAF, [Wind Rating Guidance](https://www.ipaf.org/sites/default/files/2021-12/IPAF%20Wind%20Rating%20Guidance%20%28TE-1092-0620-1-en-US%29.pdf)
- Genie, [Manual do Operador GS-1930 (ManualsLib)](https://www.manualslib.com/manual/1247150/Genie-Gs-1930.html?page=14)
- Genie AerialPros, [Wind speed ratings on MEWPs](https://www.genielift.com/en/aerialpros/wind-speed-ratings-mewp)
- Genie AerialPros, [Daily maintenance on scissor lifts](https://www.genielift.com/en/aerialpros/daily-maintenance-on-scissor-lifts)
- MTE, [NR-18 atualizada](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-18-atualizada-2026.pdf)
- MTE, [Portaria SEPRT 3.733/2020 (altera a NR-18)](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2020/Portaria_SEPRT_3.733_Altera_a_NR_18.pdf)
- Portaria SIT/DSST 15/2007, [Anexo PTA da NR-18 (histórico)](https://www.normaslegais.com.br/legislacao/portariasst15_2007.htm)
- CBIC, [Manual SST: capacitação operador de PEMT](https://cbic.org.br/wp-content/uploads/2022/11/cbicmanualsst2021anexoagrupo012.pdf)
- OSHA, [Aerial Lifts Fact Sheet](https://www.osha.gov/Publications/aerial-lifts-factsheet.pdf)
- Checklists universitários: [Purdue MEWP](https://www.purdue.edu/REM/documents/forms/mewppsi.pdf), [KU Scissor Lift](https://ehs.ku.edu/sites/ehs/files/files/Occupational%20Safety/Scissor%20Lift%20Pre_Use%20Inspection%20Checklist-2_accessible.pdf)
