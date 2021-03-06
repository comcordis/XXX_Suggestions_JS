/*

Arrow right:
	- If at last position:
		- If no more complement:
			- do nothing X
		- If still a complement:
			- user the complement X
	- If at previous position:
		- next character X
	
Enter:
	- Literal without complement X

Backspace:
	- Always 1 character backwards deleted X
	
Delete:
	- Always 1 character forwards deleted X
	
Arrow left:
	- Just previous character X

Up arrow:
	- If suggestion:
		- If no selection ,last suggestion X
		- If selection, previous suggestion X
		- If first suggestion, original value to complete X
	- If no suggestions:
		- Beginning of original value to complete X
	
Down arrow:
	- If suggestions:
		- If no suggestion, first suggestion X
		- If selection, next suggestion X
		- If last suggestion, original value to complete X
	- If no suggestions: X
		- End of original value to complete X
	
Mouse over:
	- Only change selected index X
	
Mouse click:
	- Set value X
	- Confirm suggestion X

* Multiple spaces are filtered out as 1 space X
* Values are trimmed at begin X

Type Ahead:
	- Show selection with complement X
	- On blur, selection loses, should erase options if type ahead
	- Backspace bug


Zodra die geen suggesties meer kan vinden, pakt die de eerste suggestie van de laatste als uitgangspunt voor het resultaat

Als alle woorden in de resultaten met valueAskingSuggestions begint, dan typeahead

Als er maar 1 result is en dat is hetzelfde als het huidige, dan geen result.

Last known result? Anders melding, we begrijpen uw locatie niet bla bla. X


- onEnter press fix
- if empty, alert
- loading icon


*/
	
var XXX_SuggestionController = function (input, suggestionProvider, example, minimumCharacterLength)
{
	this.ID = XXX.createID();
	
	this.requestSuggestionsDelay = 80;
	this.requestSuggestionsDelayInstance = false;
	
	this.openRequestTotal = 0;
	
	this.minimumCharacterLength = 2;
	
	if (XXX_Type.isPositiveInteger(minimumCharacterLength))
	{
		this.minimumCharacterLength = minimumCharacterLength;
	}
	
	this.valueAskingSuggestions = '';
	this.filteredValueAskingSuggestions = '';
	this.previousCaretPosition = -1;
	this.previousValue = '';

	this.typeAheadCharacterLength = 0;
	this.appendTypeAheadOnSuggestionProviderResponse = false;
	
	this.focused = false;
	
	this.example = '...';
	if (example)
	{
		this.example = example;
	}
	
	this.elements = {};
	
	this.elements.input = XXX_DOM.get(input);
	this.elements.suggestionProvider = suggestionProvider;
	this.elements.parent = XXX_DOM.getParent(this.elements.input);
	
		var clearLink = XXX_DOM.createElementNode('a');
		clearLink.href = '#';
		XXX_DOM.setInner(clearLink, 'X');
		XXX_DOM.setInner(clearLink, '<img class="YAT_icon" src="' + XXX_URI.currentHTTPServerProtocolPrefix + XXX_URI.staticURIPathPrefix + 'YAT/presenters/images/icons/black/cross.png">');
		
		XXX_DOM.appendChildNode(this.elements.parent, clearLink);

		
	this.elements.clearLink = clearLink;

	XXX_CSS.setStyle(this.elements.clearLink, 'position', 'absolute');
	XXX_CSS.setStyle(this.elements.clearLink, 'top', '7px');
	XXX_CSS.setStyle(this.elements.clearLink, 'right', '3px');
	
	XXX_CSS.setStyle(this.elements.input, 'background-color', 'transparent');
	
	
		var hiddenInputDataName = '';
		if (XXX_Type.isValue(this.elements.input.name))
		{
			hiddenInputDataName += this.elements.input.name;
		}
		else if (XXX_Type.isValue(this.elements.input.id))
		{
			hiddenInputDataName += this.elements.input.id;
		}
	hiddenInputDataName += '_data';
	
		var hiddenInputData = XXX_DOM.get(hiddenInputDataName);
		
		if (!hiddenInputData)
		{
			hiddenInputData = XXX_DOM.createElementNode('input');
			hiddenInputData.type = 'hidden';
			hiddenInputData.name = hiddenInputDataName;
			
			XXX_DOM.appendChildNode(this.elements.parent, hiddenInputData);
		}
	this.elements.hiddenInputData = hiddenInputData;
	
	
	this.eventDispatcher = new XXX_EventDispatcher();
	
	XXX_CSS.setClass(this.elements.input, 'suggestionController_valueAskingSuggestions');
	
	this.elements.suggestionOptionSelection = new XXX_SuggestionOptionSelection(this.elements.parent, this);
			
	var XXX_SuggestionController_instance = this;
	
	XXX_DOM_NativeHelpers.nativeSelectionHandling.enable(this.elements.input);
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'keyDown', function (nativeEvent)
	{
		console.log('keyDownHandler');
		XXX_SuggestionController_instance.keyDownHandler(nativeEvent);
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'keyUp', function (nativeEvent)
	{
		console.log('keyUpHandler');
		XXX_SuggestionController_instance.keyUpHandler(nativeEvent);
	});
		
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'keyPress', function (nativeEvent)
	{
		console.log('keyPressHandler');
		//XXX_SuggestionController_instance.keyUpHandler(nativeEvent);
	});
		
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'input', function (nativeEvent)
	{
		console.log('inputHandler');
		XXX_SuggestionController_instance.inputHandler(nativeEvent);
	});
		
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'blur', function (nativeEvent)
	{
		XXX_SuggestionController_instance.blurHandler();
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'focus', function (nativeEvent)
	{
		XXX_SuggestionController_instance.focusHandler();
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.clearLink, 'click', function (nativeEvent)
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
		
		XXX_SuggestionController_instance.clickedClear();
	});
	
	this.tryEnablingExample();
	this.updateClearVisibility();
};

XXX_SuggestionController.prototype.inputHandler = function (nativeEvent)
{
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
		
	// find inserted or removed characters
	function findDelta (value, prevValue)
	{
		var delta = '';
		
		for (var i = 0; i < value.length; i++)
		{
			var str = value.substr(0, i) + value.substr(i + value.length - prevValue.length);
			
			if (str === prevValue)
			{
				delta = value.substr(i, value.length - prevValue.length);
			}
		}
		
		return delta;
	}
	
	// get inserted chars
	var inserted = findDelta(value, this.previousValue);
	// get removed chars
	var removed = findDelta(this.previousValue, value);
	// determine if user pasted content
	var pasted = inserted.length > 1 || (!inserted && !removed);
	
	if (inserted || pasted)
	{
		this.keyUpHandler({keyCode: 65});
	}
	else if (removed)
	{
		this.keyUpHandler({keyCode: 8});
	}
};

XXX_SuggestionController.prototype.blurHandler = function ()
{
	console.log('blurHandler');
	this.focused = false;
	this.elements.suggestionOptionSelection.hide();
	this.tryEnablingExample();
	this.updateClearVisibility();
	
	this.eventDispatcher.dispatchEventToListeners('blur', this);
};

XXX_SuggestionController.prototype.focusHandler = function ()
{
	console.log('focusHandler');
	this.focused = true;
	this.elements.suggestionOptionSelection.show();
	this.elements.suggestionOptionSelection.rerender();
	this.tryDisablingExample();
	this.updateClearVisibility();
};

XXX_SuggestionController.prototype.clickedClear = function ()
{
	XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.input, '');
	this.hideClear();
	this.resetDataFromSelectedSuggestionOption();
	this.elements.suggestionOptionSelection.resetSuggestionOptions();
	this.tryEnablingExample();
	this.elements.input.focus();
	this.elements.suggestionOptionSelection.show();
	this.elements.suggestionOptionSelection.rerender();
};

XXX_SuggestionController.prototype.hideClear = function ()
{
	XXX_CSS.setStyle(this.elements.clearLink, 'display', 'none');
};

XXX_SuggestionController.prototype.showClear = function ()
{
	XXX_CSS.setStyle(this.elements.clearLink, 'display', 'block');
};

XXX_SuggestionController.prototype.updateClearVisibility = function ()
{
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	
	if (value == '' || value == this.example)
	{
		this.hideClear();
	}
	else
	{
		this.showClear();
	}
};

XXX_SuggestionController.prototype.setExample = function (example)
{
	this.tryDisablingExample();

	this.example = example;

	this.tryEnablingExample();
};

XXX_SuggestionController.prototype.tryDisablingExample = function ()
{
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	
	if (value == this.example)
	{
		XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.input, '');
		
		XXX_CSS.removeClass(this.elements.input, 'XXX_TextInputExample_example');
	}
};

XXX_SuggestionController.prototype.tryEnablingExample = function ()
{
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	
	if (value == '')
	{
		XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.input, this.example);
		
		this.hideClear();
		XXX_CSS.addClass(this.elements.input, 'XXX_TextInputExample_example');
	}
};


XXX_SuggestionController.prototype.getData = function ()
{
	var result = false;
	
	var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
	if (selectedSuggestionOption)
	{
		result = selectedSuggestionOption.data;
	}
	else
	{
		var tempData = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.hiddenInputData);
		
		if (tempData)
		{
			tempData = XXX_String_JSON.decode(tempData);
		}
		else
		{
			tempData = false;
		}
		
		result = tempData;
	}
	
	return result;
};

XXX_SuggestionController.prototype.propagateDataFromSelectedSuggestionOption = function ()
{
	var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
	if (selectedSuggestionOption)
	{
		XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.hiddenInputData, XXX_String_JSON.encode(selectedSuggestionOption.data));
		
		this.setValue(selectedSuggestionOption.suggestedValue);		
		//XXX_DOM_NativeHelpers.nativeCharacterLineInput.focus(this.elements.input);
	}
	else
	{
		XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.hiddenInputData, '');
	}
	
	this.eventDispatcher.dispatchEventToListeners('change', this);
};

XXX_SuggestionController.prototype.resetDataFromSelectedSuggestionOption = function ()
{
	XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.hiddenInputData, '');
	
	//this.eventDispatcher.dispatchEventToListeners('change', this);
};

XXX_SuggestionController.prototype.trySelectingNextSuggestionIfNoneSelected = function ()
{	
	if (this.elements.suggestionOptionSelection.getSuggestionOptionTotal() > 0)
	{
		var tempData = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.hiddenInputData);
		
		if (tempData)
		{
			tempData = XXX_String_JSON.decode(tempData);
		}
		else
		{
			tempData = false;
		}
		
		if (!tempData)
		{
			this.elements.suggestionOptionSelection.selectNextSuggestionOption();
			this.elements.suggestionOptionSelection.rerender();
			
			var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
			if (selectedSuggestionOption)
			{
				this.setValue(selectedSuggestionOption.suggestedValue);
			}
			else
			{
				this.setValue(this.valueAskingSuggestions);
			}
		
			this.propagateDataFromSelectedSuggestionOption();
			
			XXX_DOM_NativeHelpers.nativeCharacterLineInput.blur(this.elements.input);
			this.focused = false;
			this.elements.suggestionOptionSelection.hide();
			this.tryEnablingExample();
			this.updateClearVisibility();
		}
	}
};

XXX_SuggestionController.prototype.keyUpHandler = function (nativeEvent)
{
	var requestSuggestions = false;
	
	var caretPosition = XXX_DOM_NativeHelpers.nativeSelectionHandling.getCaretPosition(this.elements.input);
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	var valueCharacterLength = XXX_String.getCharacterLength(value);
	var caretIsAtEnd = caretPosition == valueCharacterLength;
	var previousCaretWasAtEnd = this.previousCaretPosition == valueCharacterLength;
	
	if (XXX_Device_Keyboard.isKey(nativeEvent, 'upArrow'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
		
		// If no suggestion options, set caret to beginning
		if (this.elements.suggestionOptionSelection.getSuggestionOptionTotal() == 0)
		{
			XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, 0);
		}
		else
		{
			this.elements.suggestionOptionSelection.selectPreviousSuggestionOption();
			this.elements.suggestionOptionSelection.rerender();
			
			
			var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
			if (selectedSuggestionOption)
			{
				this.setValue(selectedSuggestionOption.suggestedValue);
			}
			else
			{
				this.setValue(this.valueAskingSuggestions);
			}
			
			this.propagateDataFromSelectedSuggestionOption();
		}
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'downArrow'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
		
		// If no suggestion options, set caret at end
		if (this.elements.suggestionOptionSelection.getSuggestionOptionTotal() == 0)
		{
			XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, valueCharacterLength);
		}
		else
		{
			if (!caretIsAtEnd)
			{
				XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, valueCharacterLength);
			}
			else
			{
				this.elements.suggestionOptionSelection.selectNextSuggestionOption();
				this.elements.suggestionOptionSelection.rerender();
				
				var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
				
				if (selectedSuggestionOption)
				{
					this.setValue(selectedSuggestionOption.suggestedValue);
				}
				else
				{
					this.setValue(this.valueAskingSuggestions);
				}
			
				this.propagateDataFromSelectedSuggestionOption();
			}
		}
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'leftArrow'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'rightArrow'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
		
		if (caretIsAtEnd && previousCaretWasAtEnd)
		{
			var firstSuggestionOption = this.elements.suggestionOptionSelection.getFirstSuggestionOption();
		
			if (firstSuggestionOption)
			{
				if (firstSuggestionOption.suggestedValue != this.filteredValueAskingSuggestions)
				{
					this.setValue(firstSuggestionOption.suggestedValue);
					
					requestSuggestions = true;
				}
			}
		}
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'enter'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();

		XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, valueCharacterLength);
			
		this.propagateDataFromSelectedSuggestionOption();
		
		this.elements.suggestionOptionSelection.resetSuggestionOptions();
		this.elements.suggestionOptionSelection.hide();
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'backspace'))
	{
		this.resetDataFromSelectedSuggestionOption();

		// Makes no sense on deletion to apply type ahead
		this.appendTypeAheadOnSuggestionProviderResponse = false;
		
		requestSuggestions = true;
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'delete'))
	{
		this.resetDataFromSelectedSuggestionOption();

		// Makes no sense on deletion to apply type ahead
		this.appendTypeAheadOnSuggestionProviderResponse = false;

		requestSuggestions = true;
	}
	else if
	(
		XXX_Device_Keyboard.isKey(nativeEvent, 'space') ||
		XXX_Device_Keyboard.isKeyClass(nativeEvent, 'alpha') ||
		XXX_Device_Keyboard.isKeyClass(nativeEvent, 'integer') ||
		XXX_Device_Keyboard.isKeyClass(nativeEvent, 'operator') ||
		XXX_Device_Keyboard.isKeyClass(nativeEvent, 'punctuation')
	)
	{
		this.resetDataFromSelectedSuggestionOption();

		this.appendTypeAheadOnSuggestionProviderResponse = true;
		
		requestSuggestions = true;
	}
		
	if (requestSuggestions)
	{
		this.cancelPreviousSuggestions();

		this.elements.suggestionOptionSelection.show();
		this.elements.suggestionOptionSelection.startLoading();
		
		if (this.requestSuggestionsDelay > 0)
		{
			this.startRequestSuggestionsDelay();
		}
		else
		{
			this.requestSuggestions();
		}
	}
	
	this.previousCaretPosition = caretPosition;
	this.previousValue = value;
	
	this.updateClearVisibility();
};

XXX_SuggestionController.prototype.keyDownHandler = function (nativeEvent)
{
	if (XXX_Device_Keyboard.isKey(nativeEvent, 'enter'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
	}
	
	this.updateClearVisibility();
};

XXX_SuggestionController.prototype.startRequestSuggestionsDelay = function ()
{
	if (this.requestSuggestionsDelayInstance)
	{
		XXX_Timer.cancelDelay(this.requestSuggestionsDelayInstance);
	}

	var XXX_SuggestionController_instance = this;
	
	this.requestSuggestionsDelayInstance = XXX_Timer.startDelay(this.requestSuggestionsDelay, function ()
	{
		XXX_SuggestionController_instance.requestSuggestions();
	});
};

XXX_SuggestionController.prototype.cancelPreviousSuggestions = function ()
{
	this.elements.suggestionProvider.cancelRequestSuggestions();
	
	var valueAskingSuggestions = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	var valueAskingSuggestionsCharacterLength = XXX_String.getCharacterLength(valueAskingSuggestions);
	
	var filteredValueAskingSuggestions = XXX_String.filterSuggestion(valueAskingSuggestions);
	
	//this.resetTypeAhead();
	
	this.elements.suggestionOptionSelection.resetSuggestionOptions();
	this.elements.suggestionOptionSelection.rerender();
	
	if (filteredValueAskingSuggestions == '')
	{
		this.valueAskingSuggestions = '';
		this.filteredValueAskingSuggestions = '';
	}
	else
	{
		this.valueAskingSuggestions = valueAskingSuggestions;
		this.filteredValueAskingSuggestions = filteredValueAskingSuggestions;
	}
};

XXX_SuggestionController.prototype.requestSuggestions = function ()
{
	if (this.filteredValueAskingSuggestions != '' && XXX_String.getCharacterLength(this.filteredValueAskingSuggestions) >= this.minimumCharacterLength)
	{
		var XXX_SuggestionController_instance = this;
		
		var completedCallback = function (valueAskingSuggestions, processedSuggestions)
		{
			XXX_SuggestionController_instance.completedResponseHandler(valueAskingSuggestions, processedSuggestions);
		};
		
		var failedCallback = function ()
		{
			XXX_SuggestionController_instance.failedResponseHandler();
		};
		
		++this.openRequestTotal;
		
		this.eventDispatcher.dispatchEventToListeners('loading', this);
		
		this.elements.suggestionProvider.requestSuggestions(this.valueAskingSuggestions, completedCallback, failedCallback);
	}
};

XXX_SuggestionController.prototype.failedResponseHandler = function (valueAskingSuggestions)
{
	--this.openRequestTotal;
	
	// Still relevant?
	if (this.valueAskingSuggestions == valueAskingSuggestions)
	{
		XXX_JS.errorNotification(1, 'Reached controller failed');
	}
	
};

XXX_SuggestionController.prototype.completedResponseHandler = function (valueAskingSuggestions, processedSuggestions)
{
	--this.openRequestTotal;
	
	// Still relevant?
	if (this.valueAskingSuggestions == valueAskingSuggestions)
	{
		this.elements.suggestionOptionSelection.resetSuggestionOptions();
		this.elements.suggestionOptionSelection.addSuggestionOptions(processedSuggestions);		
		
		this.elements.suggestionOptionSelection.show();
		
		this.elements.suggestionOptionSelection.rerender();
		
		if (!this.focused)
		{
			this.elements.suggestionOptionSelection.hide();
		}
	}
	else
	{
		XXX_JS.errorNotification(1, 'Received notifications not relevant to the current value asking suggestions');
	}
	
	XXX_JS.errorNotification(1, 'Open request total: ' + this.openRequestTotal);
	
	if (this.openRequestTotal <= 0)
	{
		if (this.elements.suggestionOptionSelection.getSuggestionOptionTotal() == 0)
		{
			this.eventDispatcher.dispatchEventToListeners('noResults', this);
		}
		
		this.eventDispatcher.dispatchEventToListeners('completed', this);
	}
};

XXX_SuggestionController.prototype.setValue = function (value)
{
	var valueCharacterLength = XXX_String.getCharacterLength(value);
	
	XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.input, value);
	
	XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, valueCharacterLength);
};










	

