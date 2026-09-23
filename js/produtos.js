document.addEventListener('DOMContentLoaded', () => {
	/* ----------------------------------------------------------------------
	   Pedido: vai para POST /api/mensagens (backend/server.js), que guarda no
	   banco e manda para o e-mail da equipe. O envio está em js/formulario.js,
	   o mesmo usado pelo contato em Quem Somos. Aqui não se cobra nada: a
	   equipe responde por e-mail com pagamento e prazo.
	   ---------------------------------------------------------------------- */
	const form = document.getElementById('orderForm');
	const status = document.getElementById('orderStatus');
	const botao = form?.querySelector('.order-submit');
	const formularios = window.EloFormulario;

	formularios.preencherComSessao(form);

	form?.addEventListener('submit', async event => {
		event.preventDefault();

		if (!form.checkValidity()) {
			formularios.status(status, 'Confira os campos marcados para a gente conseguir responder.', 'erro');
			form.reportValidity();
			return;
		}

		const valor = campo => form.elements[campo]?.value.trim() || '';
		const quantidade = Number(valor('quantidade')) || 1;
		const primeiroNome = valor('nome').split(' ')[0];

		formularios.aguardando(botao, true);
		formularios.status(status, 'Enviando seu pedido…');

		try {
			const { mensagem } = await formularios.enviar({
				tipo: 'pedido',
				nome: valor('nome'),
				email: valor('email'),
				telefone: valor('telefone'),
				assunto: `Pedido de ${quantidade} pochete(s) ELO`,
				mensagem: valor('mensagem'),
				quantidade,
				pagamento: valor('pagamento'),
				cidade: valor('cidade'),
				site: valor('site'),
				pagina: 'produtos'
			});

			const protocolo = mensagem?.protocolo ? ` O protocolo é ${mensagem.protocolo}.` : '';
			formularios.status(status, `Pedido recebido, ${primeiroNome}! A equipe responde no seu e-mail em até 2 dias úteis com as formas de pagamento e o prazo de entrega.${protocolo}`, 'ok');
			form.reset();
		} catch (e) {
			formularios.status(status, formularios.explicar(e), 'erro');
		} finally {
			formularios.aguardando(botao, false);
		}
	});

	/* ----------------------------------------------------------------------
	   Modelo 3D: a luz acompanha o tema
	   ---------------------------------------------------------------------- */
	const htmlElement = document.documentElement;
	const productModel = document.querySelector('.product-model');

	if (!productModel) return;

	const updateModelLighting = () => {
		productModel.exposure = htmlElement.getAttribute('data-theme') === 'dark' ? '1.35' : '1.1';
	};

	updateModelLighting();

	new MutationObserver(updateModelLighting).observe(htmlElement, {
		attributes: true,
		attributeFilter: ['data-theme']
	});
});
