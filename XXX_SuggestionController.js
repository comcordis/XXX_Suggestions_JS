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
	- Alleen selected index veranderen X
	
Mouse click:
	- Set value X
	- Confirm suggestion X

* Multiple spaces are filtered out as 1 space X
* Values are trimmed at begin X

Zodra die geen suggesties meer kan vinden, pakt die de eerste suggestie van de laatste als uitgangspunt voor het resultaat

Als alle woorden in de resultaten met valueAskingSuggestions begint, dan typeahead

Als er maar 1 result is en dat is hetzelfde als het huidige, dan geen result.


Last known result? Anders melding, we begrijpen uw locatie niet bla bla. X

*/
	
var XXX_SuggestionController = function (input, suggestionProvider)
{
	this.ID = XXX.createID();
	
	this.minimumLineCharacterLength = 8;
	this.maximumLineCharacterLength = 96;
	
	this.valueAskingSuggestions = '';
	this.filteredValueAskingSuggestions = '';
	this.previousCaretPosition = -1;
	
	this.elements = {};
	
	this.elements.input = XXX_DOM.get(input);
	this.elements.suggestionProvider = suggestionProvider;
	this.elements.parent = XXX_DOM.getParent(this.elements.input);
	
		
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
	
	var hiddenInputData = XXX_DOM.createElementNode('input');
	hiddenInputData.type = 'hidden';
	hiddenInputData.name = hiddenInputDataName;
	this.elements.hiddenInputData = hiddenInputData;
	
	XXX_DOM.appendChildNode(this.elements.parent, this.elements.hiddenInputData);
	
	
	
	this.elements.typeAhead = XXX_DOM.createElementNode('div');
	XXX_CSS.setClass(this.elements.typeAhead, 'suggestionController_typeAhead');
	XXX_DOM.appendChildNode(this.elements.parent, this.elements.typeAhead);
	
	this.eventDispatcher = new XXX_EventDispatcher();
	
	XXX_CSS.setClass(this.elements.input, 'suggestionController_valueAskingSuggestions');
		
	this.elements.suggestionOptionSelection = new XXX_SuggestionOptionSelection(this.elements.parent, this);
			
	var XXX_SuggestionController_instance = this;
	
	XXX_DOM_NativeHelpers.nativeSelectionHandling.enable(this.elements.input);
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'keyDown', function (nativeEvent)
	{
		XXX_SuggestionController_instance.keyDownHandler(nativeEvent);
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'keyUp', function (nativeEvent)
	{
		XXX_SuggestionController_instance.keyUpHandler(nativeEvent);
		
		XXX_SuggestionController_instance.updateLineCharacterLength();
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'paste', function (nativeEvent)
	{
		XXX_SuggestionController_instance.updateLineCharacterLength();
	});
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'cut', function (nativeEvent)
	{
		XXX_SuggestionController_instance.updateLineCharacterLength();
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'blur', function (nativeEvent)
	{
		XXX_SuggestionController_instance.elements.suggestionOptionSelection.hide();
	});
	
	XXX_DOM_NativeEventDispatcher.addEventListener(this.elements.input, 'focus', function (nativeEvent)
	{
		XXX_SuggestionController_instance.elements.suggestionOptionSelection.show();
		XXX_SuggestionController_instance.elements.suggestionOptionSelection.rerender();
	});
	
	this.updateLineCharacterLength();
};

XXX_SuggestionController.prototype.updateLineCharacterLength = function ()
{
	var value = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	
	var lineCharacterLength = XXX_String.getCharacterLength(value);	
	lineCharacterLength *= 1.1;
	lineCharacterLength = XXX_Number.ceil(lineCharacterLength);
	
	if (lineCharacterLength < this.minimumLineCharacterLength)
	{
		lineCharacterLength = this.minimumLineCharacterLength;
	}
	
	if (lineCharacterLength > this.maximumLineCharacterLength)
	{
		lineCharacterLength = this.maximumLineCharacterLength;
	}
	
	XXX_DOM_NativeHelpers.nativeCharacterLineInput.setLineCharacterLength(this.elements.input, lineCharacterLength);
};

XXX_SuggestionController.prototype.getData = function ()
{
	var result = false;
	
	var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
	if (selectedSuggestionOption)
	{
		result = selectedSuggestionOption.data;
	}
	
	return result;
};

XXX_SuggestionController.prototype.propagateDataFromSelectedSuggestionOption = function ()
{
	var selectedSuggestionOption = this.elements.suggestionOptionSelection.getSelectedSuggestionOption();
			
	if (selectedSuggestionOption)
	{
		XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.hiddenInputData, XXX_String_JSON.encode(selectedSuggestionOption.data));
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
		
		requestSuggestions = true;
	}
	else if (XXX_Device_Keyboard.isKey(nativeEvent, 'delete'))
	{
		this.resetDataFromSelectedSuggestionOption();
		
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
		
		requestSuggestions = true;
	}
		
	if (requestSuggestions)
	{
		this.requestSuggestions();
	}
	
	this.previousCaretPosition = caretPosition;
};

XXX_SuggestionController.prototype.keyDownHandler = function (nativeEvent)
{
	if (XXX_Device_Keyboard.isKey(nativeEvent, 'enter'))
	{
		nativeEvent.preventDefault();
		nativeEvent.stopPropagation();
	}
};

XXX_SuggestionController.prototype.resetTypeAhead = function ()
{
	XXX_DOM.setInner(this.elements.typeAhead, '');
};

XXX_SuggestionController.prototype.requestSuggestions = function ()
{
	var valueAskingSuggestions = XXX_DOM_NativeHelpers.nativeCharacterLineInput.getValue(this.elements.input);
	var valueAskingSuggestionsCharacterLength = XXX_String.getCharacterLength(valueAskingSuggestions);	
	
	var filteredValueAskingSuggestions = XXX_String.filterSuggestion(valueAskingSuggestions);
	
	this.resetTypeAhead();
	
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
		
		var XXX_SuggestionController_instance = this;
		
		var completedCallback = function (valueAskingSuggestions, processedSuggestions)
		{
			XXX_SuggestionController_instance.completedResponseHandler(valueAskingSuggestions, processedSuggestions);
		};
		
		var failedCallback = function ()
		{
			XXX_SuggestionController_instance.failedResponseHandler();
		};
		
		this.elements.suggestionProvider.requestSuggestions(valueAskingSuggestions, completedCallback, failedCallback);
	}
};

XXX_SuggestionController.prototype.failedResponseHandler = function (valueAskingSuggestions)
{
	// Still relevant?
	if (this.valueAskingSuggestions == valueAskingSuggestions)
	{
		XXX_JS.errorNotification(1, 'Reached controller failed');
	}
};

XXX_SuggestionController.prototype.completedResponseHandler = function (valueAskingSuggestions, processedSuggestions)
{	
	// Still relevant?
	if (this.valueAskingSuggestions == valueAskingSuggestions)
	{
		this.elements.suggestionOptionSelection.resetSuggestionOptions();
		this.elements.suggestionOptionSelection.addSuggestionOptions(processedSuggestions);		
		this.elements.suggestionOptionSelection.show();		
		this.elements.suggestionOptionSelection.rerender();
		
		var firstSuggestionOption = this.elements.suggestionOptionSelection.getFirstSuggestionOption();
		
		if (firstSuggestionOption)
		{
			// Correct with original valueAskingSuggestions
			//XXX_DOM.setInner(this.elements.typeAhead, firstSuggestionOption.valueAskingSuggestions + firstSuggestionOption.complement);
		}
		else
		{
			this.resetTypeAhead();
		}		
	}
	else
	{
		XXX_JS.errorNotification(1, 'Received notifications not relevant to the current value asking suggestions');
	}
};

XXX_SuggestionController.prototype.setValue = function (value)
{
	var valueCharacterLength = XXX_String.getCharacterLength(value);
	
	XXX_DOM_NativeHelpers.nativeCharacterLineInput.setValue(this.elements.input, value);
	
	XXX_DOM_NativeHelpers.nativeSelectionHandling.setCaretPosition(this.elements.input, valueCharacterLength);
};