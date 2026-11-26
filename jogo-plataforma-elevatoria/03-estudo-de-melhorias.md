# Estudo: o que está errado e o que melhorar antes de enviar o jogo

Revisão do simulador Operador PEMT (Labora), versão com treino de comandos e 3 fases.

## 1. Pontos técnicos que precisam de validação sua

| # | Ponto | Situação | O que fazer |
|---|---|---|---|
| 1 | **Distância da rede elétrica (3,05 m)** | Valor da tabela do manual do fabricante, de origem norte-americana. | Conferir com a NR-10 e com a regra da concessionária local e trocar o número se for diferente. |
| 2 | **Citações da NR-18** | O jogo cita "NR-18" sem número de item. A pesquisa não confirmou o item atual sobre PEMT nem a carga horária da capacitação. | Conferir no texto vigente antes de citar itens. |
| 3 | **Talabarte na tesoura** | O jogo trata como obrigatório nas fases 2 e 3 ("regra do local"). O fabricante não exige em tesoura; quem define é a análise de risco. | Decidir se a Labora quer ensinar como obrigatório sempre. |
| 4 | **Números da máquina** | Capacidade, vento, rampa e velocidades vêm de um único modelo (tesoura elétrica de 5,8 m). | Deixar claro no treinamento que cada máquina tem seus limites. |
| 5 | **Limite de inclinação de 2°** | Valor típico, varia por modelo. | Idem. |
| 6 | **Checklist com 13 pontos** | A lista da IPAF tem 43. O jogo agrupou. | Aceitável para jogo; o checklist real continua sendo o do fabricante. |

## 2. Falhas e limitações do jogo hoje

- **Controle de PS5/PS4 não testado em aparelho real.** O código está pronto, mas só foi testado com teclado. A página publicada pode bloquear o controle.
- **Tombamento quase não acontece na fase 2.** A máquina trava ao inclinar com a plataforma elevada, como a real. O acidente só aparece na fase 3 (vento com placa).
- **Sem controles de toque.** Não funciona em celular ou tablet.
- **Desempenho e som não testados em computador comum.** O jogo reduz a qualidade sozinho se ficar lento.
- **Modelos simples.** Máquina, operador e árvores são formas básicas. Texturas e céus são fotográficos.
- **Logo aproximado.** O símbolo foi redesenhado e o nome "LABORA" usa uma fonte parecida. Para ficar exato, é preciso o arquivo do logo com fundo transparente (PNG ou SVG).
- **Sem registro do aluno.** Não pede nome, não guarda histórico e não gera certificado nem relatório para imprimir.
- **Sem etapa de EPI, isolamento da área e plano de resgate como ações do jogador.** Aparecem só na APR e nas explicações.

## 3. O que foi corrigido nesta versão

- **Buraco:** saiu da frente do refletor. Agora aparece um aviso "Buraco próximo" com a distância, os riscos mapeados ficam com etiqueta no pátio e a mensagem explica o que fazer (dar ré e contornar).
- **Ponto de trabalho:** círculo no chão, parada automática na altura e serviço com um toque.
- **Enable:** opção "Segurar" (como na máquina real) ou "Fixo" (um toque liga, outro desliga).
- **APR:** análise preliminar de risco antes das fases 2 e 3, com medida de controle para cada risco e conferência.
- **Treino de comandos:** teste de cada botão com desenho animado do controle e um serviço guiado passo a passo, sem nota.
- **Marca Labora:** cores, logo, máquina verde e placa da fachada.
- **Aviso legal:** o menu e o relatório dizem que o jogo não substitui a capacitação da NR-18.

## 4. Antes de enviar para outras pessoas

1. **Compartilhamento:** o link atual é privado. Precisa ser compartilhado pelo menu Share da página, ou o jogo precisa ser hospedado em um endereço próprio.
2. **Validar os 3 primeiros pontos da tabela** (rede elétrica, citações da NR-18, talabarte).
3. **Testar com um controle real** e em um computador comum.
4. **Trocar o logo pelo arquivo oficial.**

## 5. Próximas melhorias sugeridas

- Nome do aluno e relatório final para imprimir ou salvar.
- Etapa de EPI e de isolamento da área como ações dentro do jogo.
- Falha de máquina no meio do serviço, com resgate pelo comando de solo.
- Modelos 3D mais detalhados.
- Controles de toque para tablet.

## 6. Atualização do gráfico

- Luz de ambiente fotográfica (HDRI do Poly Haven, licença CC0) nas três fases.
- Mapas de relevo gerados a partir das texturas (asfalto, piso, parede metálica, muro, lama, grama, caixote).
- Modelos 3D gerados no Higgsfield e reduzidos para o jogo: contêiner, árvore, cone, palete com caixas, estante, empilhadeira e caminhonete. Se um modelo não carregar, o jogo usa a forma simples antiga.
- A máquina e o operador continuam modelados por código, porque precisam de peças móveis.
