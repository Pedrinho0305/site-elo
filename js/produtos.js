document.addEventListener('DOMContentLoaded', () => {
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
