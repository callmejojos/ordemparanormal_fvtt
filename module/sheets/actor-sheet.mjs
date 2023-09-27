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
			classes: ['ordemparanormal_fvtt', 'sheet', 'actor'],
			template:
				'systems/ordemparanormal_fvtt/templates/actor/actor-sheet.html',
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
		return `systems/ordemparanormal_fvtt/templates/actor/actor-${this.actor.data.type}-sheet.html`;
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
		context.optionObj = CONFIG.ORDEMPARANORMAL_FVTT.dropdownDegree;
		context.system = context.data.system;

		// Prepara os dados do Agente e seus Items.
		if (actorData.type == 'Agente') {
			this._prepareItems(context);
			this._prepareAgenteData(context);
		}

		// Prepare character data and items.
		if (actorData.type == 'character') {
			this._prepareItems(context);
			this._prepareCharacterData(context);
		}

		// Prepare NPC data and items.
		if (actorData.type == 'npc') {
			this._prepareItems(context);
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
	_prepareAgenteData(context) {
		// Handle ability scores.
		for (const [k, v] of Object.entries(context.data.skills)) {
			v.label =
				game.i18n.localize(CONFIG.ORDEMPARANORMAL_FVTT.skills[k]) ?? k;
		}
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareCharacterData(context) {
		// Handle ability scores.
		for (const [k, v] of Object.entries(context.data.abilities)) {
			v.label =
				game.i18n.localize(CONFIG.ORDEMPARANORMAL_FVTT.abilities[k]) ??
				k;
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
		const spells = {
			0: [],
			1: [],
			2: [],
			3: [],
			4: [],
			5: [],
			6: [],
			7: [],
			8: [],
			9: [],
		};

		// Iterate through items, allocating to containers
		for (const i of context.items) {
			i.img = i.img || DEFAULT_TOKEN;
			// Append to gear.
			if (i.type === 'item') {
				gear.push(i);
			}
			// Append to features.
			else if (i.type === 'feature') {
				features.push(i);
			}
			// Append to spells.
			else if (i.type === 'spell') {
				if (i.data.spellLevel != undefined) {
					spells[i.data.spellLevel].push(i);
				}
			}
		}

		// Assign and return
		context.gear = gear;
		context.features = features;
		context.spells = spells;
	}

	/* -------------------------------------------- */

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		html.find('.trainingDegree_SB').on('change', (changeEvent) => {
			const valueInput = $('.trainingDegree_SB').find(':selected').val();
			const textInput = $('.trainingDegree_SB option:selected').text();
			console.log('Valor do Input: ' + valueInput);
			console.log('Texto do Input: ' + textInput);
			console.log('Valor no data do actor: ' + this.actor.system.skills.acrobacia.degree.label);
			console.log('---------------------');
		});
	

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
			const label = dataset.label ? `[roll] ${dataset.label}` : '';
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
