import { html } from 'lit';

// ------- helpers -------
function safeDivide(numerator, denominator) {
	if (
		numerator === 0 ||
		numerator === 0.0 ||
		numerator === null ||
		numerator === undefined
	) {
		return null;
	}
	if (
		denominator === 0 ||
		denominator === 0.0 ||
		denominator === null ||
		denominator === undefined
	) {
		return null;
	}
	return Number(numerator) / Number(denominator);
}

function safeAdd(a, b) {
	if (a === null || a === undefined || b === null || b === undefined) {
		return null;
	}
	return Number(a) + Number(b);
}

function safeSubstract(a, b) {
	if (a === null || a === undefined || b === null || b === undefined) {
		return null;
	}
	return Number(a) - Number(b);
}

export const editableFields = [
	'current_assets',
	'non_current_assets',
	'cash_and_equivalents',
	'current_liabilities',
	'non_current_liabilities',
	'revenue',
	'net_income',
	'eps',
	'cash_flow_from_operations',
	'cash_flow_from_investing',
	'cash_flow_from_financing',
];
// -----------------------

export function getDerivedFields(data) {
	if (!data) return null;

	const total_assets = safeAdd(data.current_assets, data.non_current_assets);

	const total_liabilities = safeAdd(
		data.current_liabilities,
		data.non_current_liabilities
	);

	const equity = safeSubstract(total_assets, total_liabilities);

	const shares = safeDivide(data.net_income, data.eps);

	const working_capital = safeSubstract(
		data.current_assets,
		data.current_liabilities
	);

	// Adjusting to 2 decimal places without rounding
	const adjustToTwoDecimals = (value) => {
		if (value === null || value === undefined) return null;
		return Math.round(value * 1000) / 1000;
	};

	const wc_ncl = adjustToTwoDecimals(
		safeDivide(working_capital, data.non_current_liabilities)
	);

	const liquidity = adjustToTwoDecimals(
		safeDivide(data.current_assets, data.current_liabilities)
	);

	const leverage = adjustToTwoDecimals(safeDivide(total_liabilities, equity));

	const solvency = adjustToTwoDecimals(
		safeDivide(total_assets, total_liabilities)
	);

	const net_margin = adjustToTwoDecimals(
		safeDivide(data.net_income, data.revenue)
	);

	const book_value = adjustToTwoDecimals(safeDivide(equity, shares));

	const roa = adjustToTwoDecimals(safeDivide(data.net_income, total_assets));

	const roe = adjustToTwoDecimals(safeDivide(data.net_income, equity));

	const newData = {
		...data,
		equity,
		total_assets,
		total_liabilities,
		shares,
		working_capital,
		wc_ncl,
		liquidity,
		leverage,
		solvency,
		net_margin,
		book_value,
		roa,
		roe,
	};

	return newData;
}

export function addChanges(out) {
	if (!out) return {};

	const pctChange = (curr, prev) => {
		if (prev === 0 || prev == null || curr == null) return null;
		return +(((curr - prev) / Math.abs(prev)) * 100).toFixed(2);
	};

	const result = { ...out };

	for (const key of Object.keys(out)) {
		const [year, period] = key.split('-');
		const prevKey = `${+year - 1}-${period}`;

		if (!out[prevKey]) continue; // skip if missing

		const currData = out[key];
		const prevData = out[prevKey];

		for (const field in currData) {
			if (
				typeof currData[field] === 'number' &&
				typeof prevData[field] === 'number'
			) {
				result[key][`${field}_change`] = pctChange(
					currData[field],
					prevData[field]
				);
			}
		}
	}

	return result;
}

export function addRatiosChange(current, previous) {
	const result = { ...current };

	for (const key of Object.keys(current)) {
		const currVal = current[key];
		const prevVal = previous[key];

		if (
			!prevVal ||
			isNaN(prevVal) ||
			prevVal === 0 ||
			!currVal ||
			isNaN(currVal) ||
			currVal === 0
		) {
			result[`${key}_change`] = '';
			continue;
		}

		let change;

		if (prevVal < 0 && currVal < 0) {
			change =
				Math.round(
					((Math.abs(prevVal) - Math.abs(currVal)) / Math.abs(prevVal)) *
						100 *
						10
				) / 10;
		} else if (prevVal < 0 && currVal > 0) {
			change = Math.abs(
				Math.round(((currVal - prevVal) / prevVal) * 100 * 10) / 10
			);
		} else {
			change = Math.round(((currVal - prevVal) / prevVal) * 100 * 10) / 10;
		}

		result[`${key}_change`] = change;
	}

	return result;
}

export function calculateRatiosWithPrice(price, data) {
	if (!price || !data) {
		let ratios = {
			ev: null,
			ev_cfo: null,
			per: null,
			p_bv: null,
			score: null,
			ev_cap: null,
			ev_net_income: null,
		};
		return ratios;
	}

	price = parseFloat(price);
	let sharesOutstanding = data.shares ? Math.floor(Number(data.shares)) : null;
	let totalDebt = data.total_liabilities
		? Math.floor(Number(data.total_liabilities))
		: null;
	let cash = data.cash_and_equivalents
		? Math.floor(Number(data.cash_and_equivalents))
		: null;
	let ocf = data.cash_flow_from_operations
		? Math.floor(Number(data.cash_flow_from_operations))
		: null;
	let eps = data.eps ? Number(data.eps) : null;
	let vc = data.book_value ? Number(data.book_value) : null;
	let netIncome = data.net_income ? Math.floor(Number(data.net_income)) : null;
	let score = null;
	let marketCap = sharesOutstanding ? price * sharesOutstanding : null;
	let ev = totalDebt && cash && marketCap ? marketCap + totalDebt - cash : null;
	let ev_cfo = ocf && ev ? ev / ocf : null;
	let per = eps ? price / eps : null;
	let p_bv = vc ? price / vc : null;
	let ev_cap = marketCap && ev ? ev / marketCap : null;
	let ev_net_income = netIncome && ev ? ev / netIncome : null;

	if (
		netIncome === null ||
		sharesOutstanding === null ||
		ev_cap === null ||
		p_bv === null
	) {
		score = null;
	} else if (eps <= 0 || vc <= 0 || ocf <= 0 || netIncome <= 0) {
		score = 0;
	} else if (ev <= 0) {
		score = 10;
	} else {
		const reciprocalTransform = (value, max) =>
			value === null ? null : value > max ? 0 : 10 * (1 - value / max);

		const normalized_ev_cfo = reciprocalTransform(ev_cfo, 50);
		const normalized_per = reciprocalTransform(per, 50);
		const normalized_p_bv = reciprocalTransform(p_bv, 20);

		if (normalized_per === null || normalized_p_bv === null) {
			score = null;
		} else if (normalized_ev_cfo == null) {
			const weight_per = 0.5;
			const weight_p_bv = 0.5;
			score = weight_per * normalized_per + weight_p_bv * normalized_p_bv;
		} else {
			const weight_ev_cfo = 0.4;
			const weight_per = 0.3;
			const weight_p_bv = 0.3;
			score =
				weight_ev_cfo * normalized_ev_cfo +
				weight_per * normalized_per +
				weight_p_bv * normalized_p_bv;
		}
	}

	const ratios = {
		ev,
		ev_cfo,
		per,
		p_bv,
		score,
		ev_cap,
		ev_net_income,
	};

	for (const key in ratios) {
		if (isNaN(ratios[key]) || ratios[key] === null) {
			ratios[key] = null;
		} else {
			if (key === 'ev') {
				ratios[key] = Math.floor(ratios[key]);
			} else {
				ratios[key] = Math.round(ratios[key] * 100) / 100;
			}
		}
	}

	return ratios;
}

export function priceForWhishedPer(wishedPER, eps) {
	if (!wishedPER || !eps) return html`<p class="na">NA</p>`;
	return html`${Math.round(Number(wishedPER) * Number(eps))}
		<sub class="label gray-text">p needed</sub>`;
}

export function incomeForWishedPER(price, wishedPER, shares, netIncome, lang) {
	if (!price || !wishedPER || !shares || !netIncome)
		return html`<p class="na">NA</p>`;

	const locale = lang === 'ES' ? 'es-ES' : 'en-US';

	const priceNumber = Number(price);
	const wishedPERNumber = Number(wishedPER);
	const sharesNumber = Number(shares);
	const netIncomeNumber = Number(netIncome);

	if (
		isNaN(priceNumber) ||
		isNaN(wishedPERNumber) ||
		isNaN(sharesNumber) ||
		wishedPERNumber <= 0 ||
		sharesNumber <= 0
	) {
		return { value: 'π', percentChange: null };
	}

	const requiredEPS = priceNumber / wishedPERNumber;
	const requiredNetIncome = Math.round(requiredEPS * sharesNumber);

	const percentChange = netIncomeNumber
		? Math.round(
				((requiredNetIncome - netIncomeNumber) / Math.abs(netIncomeNumber)) *
					1000
		  ) / 10
		: null;

	let formattedValue;
	if (requiredNetIncome >= 1000000) {
		const millionValue = Math.round(requiredNetIncome / 1000000);
		formattedValue = `${millionValue.toLocaleString(locale, {
			maximumFractionDigits: 0,
			useGrouping: true,
		})}M`;
	} else {
		formattedValue = `${requiredNetIncome.toLocaleString(locale, {
			maximumFractionDigits: 0,
			useGrouping: true,
		})}`;
	}

	let changeHTML = '';
	if (percentChange) {
		if (percentChange > 0) {
			changeHTML = html`<sub class="green-text">${percentChange}%</sub>`;
		} else if (percentChange < 0) {
			changeHTML = html`<sub class="red-text">${percentChange}%</sub>`;
		} else {
			changeHTML = html`<sub class="gray-text">${percentChange}%</sub>`;
		}
	}

	return html`<p>
		${formattedValue}${changeHTML}<sub class="label gray-text"> π needed</sub>
	</p>`;
}
