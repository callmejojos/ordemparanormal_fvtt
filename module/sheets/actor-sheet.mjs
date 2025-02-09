/* eslint-disable no-unused-vars */
import {
	onManageActiveEffect,
	prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class OrdemActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['ordemparanormal', 'sheet', 'actor'],
			template: 'systems/ordemparanormal/templates/actor/actor-sheet.html',
			width: 600,
			height: 849,
			tabs: [
				{
					navSelector: '.sheet-tabs',
					contentSelector: '.sheet-body',
					initial: 'features',
				},
			],
		});
	}

	/** @override */
	get template() {
		return `systems/ordemparanormal/templates/actor/actor-${this.actor.data.type}-sheet.html`;
	}

	/* -------------------------------------------- */

	/** @override */
	getData() {
		// Retrieve the data structure from the base sheet. You can inspect or log
		// the context variable to see the structure, but some key properties for
		// sheets are the actor object, the data object, whether or not it's
		// editable, the items array, and the effects array.
		const context = super.getData();
	
		// Use a safe clone of the actor data for further operations.
		const actorData = this.actor.data.toObject(false);

		// Add the actor's data to context.data for easier access, as well as flags.
		context.data = actorData.data;
		context.flags = actorData.flags;

		// Dropdown
		context.optionDegree = CONFIG.ordemparanormal.dropdownDegree;
		context.optionClass = CONFIG.ordemparanormal.dropdownClass;
		context.optionTrilhas = CONFIG.ordemparanormal.dropdownTrilha;
		context.optionOrigins = CONFIG.ordemparanormal.dropdownOrigins;

		// Prepara os dados do Agente e seus Items.
		if (actorData.type == 'agent') {
			this._prepareItems(context);
			this._prepareAgentData(context);
			this._prepareItemsDerivedData(context);
		}

		// Add roll data for TinyMCE editors.
		context.rollData = context.actor.getRollData();

		// Prepare active effects
		context.effects = prepareActiveEffectCategories(this.actor.effects);

		return context;
	}

	/**
	 * Organiza e classifica os items para Planilha de Personagem.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareAgentData(context) {

		// Acesso Rápido
		const NEX = context.data.NEX.value;
		const AGI = context.data.attributes.agi.value;
		const VIG = context.data.attributes.vig.value;
		const FOR = context.data.attributes.for.value;
		const INT = context.data.attributes.int.value;
		const PRE = context.data.attributes.pre.value;
		const DEFESA = context.data.defense.value;

		// DEFESA E ESQUIVA
		context.data.defense.value = 10 + AGI;
		context.data.defense.dodge = DEFESA + context.data.skills.reflexos.value;

		// NEX
		const calcNEX = (NEX < 99) ? Math.floor(NEX / 5) : 20;

		// PE / RODADA
		context.data.PE.perRound = calcNEX;

		// DEFININDO STATUS CONFORME A CLASSE
		if (context.data.class == 'Combatente') {
			context.data.PV.max = (20 + VIG) + ((calcNEX > 1) ? (calcNEX-1) * (4 + VIG) : '');
			context.data.PE.max = (2 + PRE) + ((calcNEX > 1) ? (calcNEX-1) * (2 + PRE) : '');
			context.data.SAN.max = (12) + ((calcNEX > 1) ? (calcNEX-1) * 3 : '');
		} else if (context.data.class == 'Especialista') {
			context.data.PV.max = (16 + VIG) + ((calcNEX > 1) ? (calcNEX-1) * (3 + VIG) : '');
			context.data.PE.max = (3 + PRE) + ((calcNEX > 1) ? (calcNEX-1) * (3 + PRE) : '');
			context.data.SAN.max = (16) + ((calcNEX > 1) ? (calcNEX-1) * 4 : '');
		} else if (context.data.class == 'Ocultista') {
			context.data.PV.max = (12 + VIG) + ((calcNEX > 1) ? (calcNEX-1) * (2 + VIG) : '');
			context.data.PE.max = (4 + PRE) + ((calcNEX > 1) ? (calcNEX-1) * (4 + PRE) : '');
			context.data.SAN.max = (20) + ((calcNEX > 1) ? (calcNEX-1) * 5 : '');
		} else {
			context.data.PV.max = (10);

			context.data.PE.max = (10);

			context.data.SAN.max = (10);
		}

		/**
		 * Faz um loop das perícias e depois faz algumas verificações para definir a formula de rolagem,
		 * depois disso, salva o valor nas informações 
		 * */ 
		for (const [keySkill, skillsName] of Object.entries(context.data.skills)) {

			// Definindo constantes para acesso simplificado.
			const carga = skillsName.conditions.carga;
			const trained = skillsName.conditions.trained;

			// Formando o nome com base nas condições de carga e treino da perícia.
			skillsName.label =
				game.i18n.localize(CONFIG.ordemparanormal.skills[keySkill]) +
				((carga) ? '+' : (trained) ? '*' : '') ?? k;

			/** FORMULA DE ROLAGEM
			 * Criando o que vem antes e depois do D20 das perícias.
			 * beforeD20Formula: verifica se o atributo da perícia é 0 ou maior do que zero.
			 * 	Se (perícia) = 0: dois dados e pegue o menor valor;
			 * 	Se (perícia) > 0: simplemente atribua o valor.
			 * afterD20Formula: verifica se é preciso pegar o menor valor ou o maior valor das rolagens
			 * além disso, atribui a soma do resultado final.
			 * 	Se (perícia) = 0: pegue o MENOR valor como resultado;
			 * 	Se (perícia) > 0: pegue o MAIOR valor como resultado.
			 * */  
			const beforeD20Formula = 
				((skillsName.attr[1]) ? skillsName.attr[1] : 2);

			const afterD20Formula = 
				((skillsName.attr[1] != 0) ? 'kh' : 'kl') +
				((skillsName.value != 0) ? '+' + skillsName.value : '') +
				((skillsName.mod) ? '+' + skillsName.mod : '');

			skillsName.formula = beforeD20Formula + 'd20' + afterD20Formula;


		}
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareItems(context) {
		// Initialize containers.
		const gear = [];
		const features = [];

		const protection = [];
		const generalEquipament = [];
		const armament = [];
		const rituals = {
			1: [],
			2: [],
			3: [],
			4: [],
		};

		// Iterate through items, allocating to containers
		for (const i of context.items) {
			i.img = i.img || DEFAULT_TOKEN;
			// Append to protections.
			if (i.type === 'protection') {
				protection.push(i);
			}
			// Append to general equipament.
			else if (i.type === 'generalEquipament') {
				generalEquipament.push(i);
			}
			// Append to armament.
			else if (i.type === 'armament') {
				armament.push(i);
			}
			// Append to gear.
			else if (i.type === 'item') {
				gear.push(i);
			}
			// Append to features.
			else if (i.type === 'feature') {
				features.push(i);
			}
			// Append to rituals.
			else if (i.type === 'ritual') {
				if (i.data.circle != undefined) {
					rituals[i.data.circle].push(i);
				}
			}
		}

		// Assign and return
		context.gear = gear;
		context.features = features;

		context.rituals = rituals;
		context.protection = protection;
		context.generalEquip = generalEquipament;
		context.armament = armament;
	}

	/**
	 * Prepare and calcule the data of items
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareItemsDerivedData(context) {
		const items = context.items;
		console.log('items: ');
		for (const p of context.protection) {
			console.log(typeof p.data.defense);
			if (typeof p.data.defense == 'number') {
				context.data.defense.value += p.data.defense;
			}
		}
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// html.find('.trainingDegree_SB').on('change', (changeEvent) => {
		// 	const valueInput = $('.trainingDegree_SB').find(':selected').val();
		// 	const textInput = $('.trainingDegree_SB option:selected').text();
		// 	console.log('Valor do Input: ' + valueInput);
		// 	console.log('---------------------');
		// });
	

		// Render the item sheet for viewing/editing prior to the editable check.
		html.find('.item-edit').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const item = this.actor.items.get(li.data('itemId'));
			item.sheet.render(true);
		});

		// -------------------------------------------------------------
		// Everything below here is only needed if the sheet is editable
		if (!this.isEditable) return;

		// Add Inventory Item
		html.find('.item-create').click(this._onItemCreate.bind(this));

		// Send stuff chat
		html.find('.send-chat').click(this._onSendChat.bind(this));

		// Delete Inventory Item
		html.find('.item-delete').click((ev) => {
			const li = $(ev.currentTarget).parents('.item');
			const item = this.actor.items.get(li.data('itemId'));
			item.delete();
			li.slideUp(200, () => this.render(false));
		});

		// Active Effect management
		html.find('.effect-control').click((ev) =>
			onManageActiveEffect(ev, this.actor),
		);

		// Rollable abilities.
		html.find('.rollable').click(this._onRoll.bind(this));

		// Drag events for macros.
		if (this.actor.owner) {
			const handler = (ev) => this._onDragStart(ev);
			html.find('li.item').each((i, li) => {
				if (li.classList.contains('inventory-header')) return;
				li.setAttribute('draggable', true);
				li.addEventListener('dragstart', handler, false);
			});
		}
	}

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async _onItemCreate(event) {
		event.preventDefault();
		const header = event.currentTarget;
		// Get the type of item to create.
		const type = header.dataset.type;
		// Grab any data associated with this control.
		const data = duplicate(header.dataset);
		// Initialize a default name.
		const name = `New ${type.capitalize()}`;
		// Prepare the item object.
		const itemData = {
			name: name,
			type: type,
			data: data,
		};
		// Remove the type from the dataset since it's in the itemData.type prop.
		delete itemData.data['type'];

		// Finally, create the item!
		return await Item.create(itemData, { parent: this.actor });
	}

	/**
	 * Handle creating a new message with data of item for send to chat.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	async _onSendChat(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		const itemId = element.closest('.item').dataset.itemId;
		const item = this.actor.items.get(itemId);

		if (item.system.description) ChatMessage.create({ content: item.system.description});
		// else {
		// 	const d = new Dialog({
		// 		title: 'Alert!',
		// 		content: 'AAAAAAAA',
		// 		buttons: {},
		// 		close: () => {}
		// 	});
		//   d.render(true);
		// }
	}

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onRoll(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		// Handle item rolls.
		if (dataset.rollType) {
			if (dataset.rollType == 'item') {
				const itemId = element.closest('.item').dataset.itemId;
				const item = this.actor.items.get(itemId);
				if (item) return item.roll();
			}
		}

		// Handle rolls that supply the formula directly.
		if (dataset.roll) {
			const label = dataset.label ? `Rolando ${dataset.label}` : '';
			const roll = new Roll(dataset.roll, this.actor.getRollData());
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				flavor: label,
				rollMode: game.settings.get('core', 'rollMode'),
			});
			return roll;
		}
	}
}
