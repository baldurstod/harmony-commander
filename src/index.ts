import nlp from 'compromise'
import { Term } from '../node_modules/compromise/types/misc'
import View from '../node_modules/compromise/types/view/one'
//import { Term } from 'compromise/misc';
//import { View } from 'compromise/one';

namespace Commander {
	const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
	let recognition: SpeechRecognition | undefined;
	let active = false;
	let lang: string = 'en-US';
	let commanderLexicon: { [key: string]: string } = {};
	let commanderPatterns = new Map<string, string>();
	let commanderTags = new Set<string>();
	const eventTarget = new EventTarget();

	export enum CommanderError {
		Ok = 0,
		Unavailable,
		Uninitialized,
		UnhandledError,
	}

	export enum SpeechEntity {
		Item = 'LoadoutItem',
		Panel = 'LoadoutPanel',
	}

	export type EntityDescriptor = {
		entity: SpeechEntity,
		value: Term,
	};

	export type CommanderSpeechEventData = {
		view: View,
		entities: Array<EntityDescriptor>,
		acknowledged: () => void,
	};


	export function start(): CommanderError {
		active = true;
		if (!recognition) {
			const err = init();
			if (err != CommanderError.Ok) {
				return err;
			}
		}

		const err = start();
		if (err != CommanderError.Ok) {
			return err;
		}

		return CommanderError.Ok;
	}

	export function stop(): CommanderError {
		return CommanderError.Ok;

	}

	export function addPattern(patterns: string | Array<string>, command: string) {
		if (typeof patterns == 'string') {
			commanderPatterns.set(patterns, command);
		} else {
			for (const pattern of patterns) {
				commanderPatterns.set(pattern, command);
			}
		}
	}


	function init(): CommanderError {
		let err: CommanderError;

		err = initSpeech();
		if (err != CommanderError.Ok) {
			return err;
		}

		return CommanderError.Ok;
	}

	function initSpeech(): CommanderError {
		if (recognition) {
			return CommanderError.Ok;
		}

		try {
			recognition = new Speech();
			recognition.lang = lang;
			recognition.maxAlternatives = 5;
			recognition.addEventListener('end', () => {
				if (active) {
					start();
				}
			});
			recognition.addEventListener('result', (event: SpeechRecognitionEvent) => {
				onResult(event);
			});
			eventTarget.dispatchEvent(new CustomEvent('speech-init'));
		} catch (e) {
			return CommanderError.Unavailable;
		}
		return CommanderError.Ok;
	}



	async function onResult(event: SpeechRecognitionEvent) {
		if (event.results.length == 0) {
			return;
		}

		console.info(event.results[0]);


		let stop = false;
		for (const alternative of event.results[0]) {
			//const doc = nlp(alternative.transcript);

			for (const [pattern, command] of commanderPatterns) {

				const view = nlp(alternative.transcript, commanderLexicon).match(pattern);
				console.info(view);
				if (view.found) {
					const entities: Array<EntityDescriptor> = [];


					for (const doc of view.document) {
						for (const token of doc) {


							for (const tag of commanderTags) {
								//for (const entityName in SpeechEntity) {
								//const entity = SpeechEntity[entityName];

								if (token.tags?.has(tag)) {
									entities.push({
										entity: tag as SpeechEntity,
										value: token,
									})
									/*
									const itemIndex = items.get(token.normal);
									if (itemIndex !== undefined) {
										this.selectItemById(itemIndex);
										(event as CustomEvent).detail.acknowledged();
										return;
									}
									*/
								}
							}
						}
					}

					eventTarget.dispatchEvent(new CustomEvent<CommanderSpeechEventData>(command, {
						detail: {
							view: view,
							entities: entities,
							acknowledged: () => (stop = true)
						}
					}));
				}
				if (stop) {
					return;
				}
			}

			continue;
			/*
			const input = await nlp.process('en', alternative.transcript);
			console.info(input);
			if (input) {
				//this.dispatchEvent(new CustomEvent('intent', { detail: input }));
				this.dispatchEvent(new CustomEvent(input.intent, { detail: { input: input, acknowledged: () => (stop = true) } }));
			}
			if (stop) {
				break;
			}
			*/
		}
	}


}
