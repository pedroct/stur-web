# 1.0.0 (2026-11-26)


### Bug Fixes

* **botao:** resolve as classes do link com cara de botão e cria o tamanho compacto ([719ea98](https://github.com/pedroct/stur-web/commit/719ea989dec0ee30756488df109f19e09f4b9730))
* **consulta:** a 13b que atravessa o ano mostra o ano nos dois lados ([a92b7a3](https://github.com/pedroct/stur-web/commit/a92b7a349c60db4431294b1885654cde2df3b878))
* **consulta:** não corta o texto colado no número da reserva ([3fe982f](https://github.com/pedroct/stur-web/commit/3fe982f3258cf51aa0138924088083e2d99d647c))
* **erro:** tela do erro da aplicação no lugar da tela quebrada ([5fb98dc](https://github.com/pedroct/stur-web/commit/5fb98dc9807211a55006f4222feeb45b8841bda1))
* **formatacao:** valida o decimal e devolve traço na data vazia dos dados do Stur ([9d3b9f1](https://github.com/pedroct/stur-web/commit/9d3b9f160cbf89416c2843143bd28ec14b3dd8bc))
* gancho de dados reais falha fechado com symlink; remove AGENTS.md e fontes Geist do CSS ([9a5a6df](https://github.com/pedroct/stur-web/commit/9a5a6dfb50405508a886ef16f21307171969f9df))
* **moldura:** marca o main como ocupado só no carregando inicial ([d0ffaec](https://github.com/pedroct/stur-web/commit/d0ffaec48a0faf13464ed0eb955556ad00ccee71))
* **navegador:** reforça o teste da chamada cancelada e descarta recente com instante inválido ([79c5ea1](https://github.com/pedroct/stur-web/commit/79c5ea1a4c82766667592c06c0159c8331459684))
* **recentes:** só aceita endereço da consulta ou da reserva ([39ece95](https://github.com/pedroct/stur-web/commit/39ece95746b8cc8aa2615ee42c8bf4733ad924f1))
* **resultado:** a seta da coluna ordenada fica fora do nome acessível ([85f2740](https://github.com/pedroct/stur-web/commit/85f2740edebbed3ad68d874d7e21d894a558a37b))
* **resultado:** mantém visível o refinamento ausente do resultado e aplica ajustes da revisão ([0f440b6](https://github.com/pedroct/stur-web/commit/0f440b63e0bedb7689f562dd4a2ad747df0722bb))
* **resultado:** o botão das contas que não fecham é descrito pelo rótulo ([b2ded6d](https://github.com/pedroct/stur-web/commit/b2ded6dfa5feb82b533ac0971b0a9df84a341b5f))
* **resultado:** refina e pagina sem rolar a página, ordena os avisos e reaproveita os textos do erro ([1b461bb](https://github.com/pedroct/stur-web/commit/1b461bb35797c642d30eed22e9df0730543f072b))
* **sonar:** o scan do web lê o próprio token, SONAR_TOKEN_WEB ([0bd01f7](https://github.com/pedroct/stur-web/commit/0bd01f77305f7edff5b9c8cf13a1d4718de29dfc))
* **tema:** devolve o anel de foco e valida o tema escolhido ([0ad9b17](https://github.com/pedroct/stur-web/commit/0ad9b17c8957281e56133fb3409e104bce7beff3))
* **tema:** mostra o anel de foco na opção destacada do menu do tema ([8050ec9](https://github.com/pedroct/stur-web/commit/8050ec93cfe410ed9abeb0bab70c183d595d3fe0))


### Features

* **api:** gera os tipos do contrato e traduz as respostas do backend em erros da tela ([771e98d](https://github.com/pedroct/stur-web/commit/771e98d34d436e92067a783140e9c81dc9f009da))
* **componentes:** selos, avisos, pílulas e o componente de filtros da consulta ([7c8499c](https://github.com/pedroct/stur-web/commit/7c8499c356a72b94120f3e04147287cea0e96241))
* **consulta:** estados da consulta por período, com carregando, erros e nenhuma venda ([7b47d3a](https://github.com/pedroct/stur-web/commit/7b47d3aad80705676098f8f4d2a6aba3335324d2))
* **consulta:** formulário de consulta com validação, atalhos de período e consultas recentes ([2991d12](https://github.com/pedroct/stur-web/commit/2991d12f46a7f1f8b55973c978deb8d681b7704f))
* **consulta:** lê e escreve a consulta no endereço, valida e descreve em texto ([d3fea25](https://github.com/pedroct/stur-web/commit/d3fea25e8cfde6ae87a8cdbb41e368ab3fc7b42b))
* **formatacao:** formata valores, datas e horas no padrão brasileiro sem passar por float ([b377f4c](https://github.com/pedroct/stur-web/commit/b377f4c99b5228ca28a76b54243447fb7cc94c78))
* **moldura:** cabeçalho com busca do topo, caminho, faixa de consulta e atalho / ([37a25bd](https://github.com/pedroct/stur-web/commit/37a25bdd68631d143a39163d1fdefd0c3a9f785d))
* **navegador:** guarda o resultado da consulta, as consultas recentes e a origem da venda ([1070724](https://github.com/pedroct/stur-web/commit/1070724924a357e43eaff532d35a80f8a4efdc1e))
* **reserva:** regra única de entrada por número, com nenhuma venda e erros ([1611f2e](https://github.com/pedroct/stur-web/commit/1611f2ee9e33105d7b40a7687e8ef83a0324c4d0))
* **resultado:** refina e pagina o resultado no navegador, sem nova chamada à API ([28d16b4](https://github.com/pedroct/stur-web/commit/28d16b4af4691fc37e3049d873e874f6fc8446b7))
* **resultado:** resultado por período com resumo, incentivos, refinamentos, tabela e paginação ([5bcdd20](https://github.com/pedroct/stur-web/commit/5bcdd2060ff1054c6e8c68c87fe0c6f872f6ab75))
* **tema:** aplica o DS da A3 sobre o shadcn com Base UI e o botão de tema ([85d8bc4](https://github.com/pedroct/stur-web/commit/85d8bc4cf622c259c9cc0bf3efce4fc775c1d311))
