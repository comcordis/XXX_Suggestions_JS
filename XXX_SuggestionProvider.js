
var XXX_SuggestionProvider = function ()
{
	this.ID = XXX.createID();
	
	this.processedSuggestions = [];
	
	this.allowCachedSuggestions = false;
	this.cachedSuggestions = [];
		
	this.valueAskingSuggestions = '';
	
	this.triedValuesToComplete = [];
	
	this.suggestionSource = 'fixed';
	this.fixedDataType = '';
	this.fixedSuggestions =
	{
		type: 'raw',
		suggestions: []
	};
	this.serverSideRoute = '';
	this.requestSuggestionsCallback = false;
	this.cancelRequestSuggestionsCallback = false;
	
	this.maximumClientSide = 5;
	this.maximumServerSide = 15;
	
	this.composeSuggestionOptionLabelCallback = false;
};

XXX_SuggestionProvider.prototype.setMaximumClientSide = function (maximumClientSide)
{
	this.maximumClientSide = XXX_Default.toPositiveInteger(maximumClientSide, 5);
};

XXX_SuggestionProvider.prototype.setMaximumServerSide = function (maximumServerSide)
{
	this.maximumServerSide = XXX_Default.toPositiveInteger(maximumServerSide, 15);	
};

XXX_SuggestionProvider.prototype.setComposeSuggestionOptionLabelCallback = function (composeSuggestionOptionLabelCallback)
{
	this.composeSuggestionOptionLabelCallback = composeSuggestionOptionLabelCallback;
};

XXX_SuggestionProvider.prototype.enableCachedSuggestions = function ()
{
	this.allowCachedSuggestions = true;
};

XXX_SuggestionProvider.prototype.disableCachedSuggestions = function ()
{
	this.allowCachedSuggestions = false;
	this.cachedSuggestions = [];
};

XXX_SuggestionProvider.prototype.setSuggestionSourceToServerSideRoute = function (route)
{
	this.suggestionSource = 'serverSideRoute';
	this.serverSideRoute = route;
};

XXX_SuggestionProvider.prototype.setSuggestionSourceToCallback = function (requestSuggestionsCallback, cancelRequestSuggestionsCallback)
{
	this.suggestionSource = 'callback';
	this.requestSuggestionsCallback = requestSuggestionsCallback;
	this.cancelRequestSuggestionsCallback = cancelRequestSuggestionsCallback;
};

XXX_SuggestionProvider.prototype.setSuggestionSourceToFixed = function (fixedSuggestionsDataType, fixedSuggestions)
{
	this.fixedSuggestionsDataType = fixedSuggestionsDataType;
	this.suggestionSource = 'fixed';
	
	if (!(fixedSuggestions.type == 'raw' || fixedSuggestions.type == 'processed'))
	{
		fixedSuggestions =
		{
			type: 'raw',
			suggestions: fixedSuggestions
		};
	}
	
	this.fixedSuggestions = fixedSuggestions;
};

XXX_SuggestionProvider.prototype.setSuggestionSourceToGeocoder = function ()
{
	var temp = new XXX_GoogleMapsAPI_GeocoderSuggestionSource();
	
	this.setSuggestionSourceToCallback(temp.getRequestSuggestionsCallback());
	this.setComposeSuggestionOptionLabelCallback(temp.composeSuggestionOptionLabel);
};

XXX_SuggestionProvider.prototype.setSuggestionSourceToPlaces = function ()
{
	var temp = new XXX_GoogleMapsAPI_PlacesSuggestionSource();
	
	this.setSuggestionSourceToCallback(temp.getRequestSuggestionsCallback());
	this.setComposeSuggestionOptionLabelCallback(temp.composeSuggestionOptionLabel);
};

XXX_SuggestionProvider.prototype.cancelRequestSuggestions = function ()
{
	switch (this.suggestionSource)
	{
		case 'serverSideRoute':
			XXX_HTTP_Browser_Request_Asynchronous.cancelRequest(this.ID + '_requestSuggestions');
			break;
		case 'callback':
			if (this.cancelRequestSuggestionsCallback)
			{
				this.cancelRequestSuggestionsCallback();
			}
			break;
	}
};


XXX_SuggestionProvider.prototype.requestSuggestions = function (valueAskingSuggestions, completedCallback, failedCallback)
{
	this.cancelRequestSuggestions();
	
	this.valueAskingSuggestions = valueAskingSuggestions;
	this.completedCallback = completedCallback;
	this.failedCallback = failedCallback;
	
	this.processedSuggestions = [];
	
	var retrievalMethod = 'live';
		
	var valueAskingSuggestionsLowerCase = XXX_String.convertToLowerCase(valueAskingSuggestions);
	
	var cachedSuggestions = [];
	
	// try cache
	if (this.allowCachedSuggestions)
	{		
		for (var i = 0, iEnd = XXX_Array.getFirstLevelItemTotal(this.cachedSuggestions); i < iEnd; ++i)
		{
			var cachedSuggestion = this.cachedSuggestions[i];
			
			var suggestedValue = cachedSuggestion.suggestedValue;
			var suggestedValueLowerCase = XXX_String.convertToLowerCase(suggestedValue);
			
			if (XXX_String.findFirstPosition(suggestedValueLowerCase, valueAskingSuggestionsLowerCase) === 0)
			{
				cachedSuggestion.valueAskingSuggestions = valueAskingSuggestions;
				cachedSuggestion.complement = XXX_String.getPart(suggestedValue, XXX_String.getCharacterLength(valueAskingSuggestions));
				
				if (this.composeSuggestionOptionLabelCallback)
				{
					cachedSuggestion.label = this.composeSuggestionOptionLabelCallback(cachedSuggestion);
				}
				else
				{
					cachedSuggestion.label = XXX_SuggestionProviderHelpers.composeSuggestionOptionLabel(cachedSuggestion);
				}
				
				cachedSuggestions.push(cachedSuggestion);
			}
		}
		
		if (XXX_Array.getFirstLevelItemTotal(cachedSuggestions) >= this.maximumClientSide)
		{
			retrievalMethod = 'cache';
		}
	}
	
	if (retrievalMethod == 'live')
	{
		if (this.allowCachedSuggestions && XXX_Array.hasValue(this.triedValuesToComplete, XXX_String.convertToLowerCase(this.valueAskingSuggestions)))
		{
			retrievalMethod = 'cache';
		}
	}
	
	switch (retrievalMethod)
	{
		case 'cache':			
			var limitedSuggestions = XXX_SuggestionProviderHelpers.limitToMaximum(cachedSuggestions, this.maximumClientSide);
			
			if (this.completedCallback)
			{
				this.completedCallback(this.valueAskingSuggestions, limitedSuggestions);
			}
			break;
		case 'live':
			var XXX_SuggestionProvider_instance = this;
			
			var completedCallback = function (suggestionsResponse)
			{
				XXX_SuggestionProvider_instance.completedResponseHandler(suggestionsResponse);
			};
			
			var failedCallback = function ()
			{
				XXX_SuggestionProvider_instance.failedResponseHandler();
			};
			
			switch (this.suggestionSource)
			{
				case 'serverSideRoute':
					XXX_HTTP_Browser_Request_Asynchronous.queueRequest(this.ID + '_requestSuggestions', XXX_URI.composeRouteURI(this.serverSideRoute), [{key: 'valueAskingSuggestions', value: valueAskingSuggestionsLowerCase}, {key: 'maximum', value: this.maximumServerSide}], completedCallback, 'json', false, 'body', false, failedCallback);
					break;
				case 'callback':
					this.requestSuggestionsCallback(valueAskingSuggestions, completedCallback, failedCallback);
					break;
				case 'fixed':
					this.completedResponseHandler(this.fixedSuggestions);
					break;
			}
			
			if (this.allowCachedSuggestions)
			{
				this.triedValuesToComplete.push(XXX_String.convertToLowerCase(this.valueAskingSuggestions));
			}
			break;
	}
};

XXX_SuggestionProvider.prototype.failedResponseHandler = function ()
{
	if (this.failedCallback)
	{
		this.failedCallback(this.valueAskingSuggestions);
	}
};

XXX_SuggestionProvider.prototype.completedResponseHandler = function (suggestionsResponse)
{
	if (suggestionsResponse && suggestionsResponse.type)
	{
		switch (suggestionsResponse.type)
		{
			case 'processed':
				this.processedSuggestions = suggestionsResponse.suggestions;
				
				for (var i = 0, iEnd = XXX_Array.getFirstLevelItemTotal(this.processedSuggestions); i < iEnd; ++i)
				{
					// Fix JSON bug, empty string being false
					if (this.processedSuggestions[i].complement === false)
					{
						this.processedSuggestions[i].complement = '';
					}
				}
				break;
			case 'raw':
				this.processedSuggestions = XXX_SuggestionProviderHelpers.processRawSuggestions(this.valueAskingSuggestions, suggestionsResponse.suggestions, this.maximumClientSide, this.fixedSuggestionsDataType);		
				break;
		}
		
		// Label
		
		for (var i = 0, iEnd = XXX_Array.getFirstLevelItemTotal(this.processedSuggestions); i < iEnd; ++i)
		{
			if (this.composeSuggestionOptionLabelCallback)
			{
				this.processedSuggestions[i].label = this.composeSuggestionOptionLabelCallback(this.processedSuggestions[i]);
			}
			else
			{
				this.processedSuggestions[i].label = XXX_SuggestionProviderHelpers.composeSuggestionOptionLabel(this.processedSuggestions[i]);
			}
		}
		
		
		
		// Append new values to cache
		if (this.allowCachedSuggestions)
		{
			for (var i = 0, iEnd = XXX_Array.getFirstLevelItemTotal(this.processedSuggestions); i < iEnd; ++i)
			{
				var alreadyCached = false;
				
				for (var j = 0, jEnd = XXX_Array.getFirstLevelItemTotal(this.cachedSuggestions); j < jEnd; ++j)
				{
					if (this.processedSuggestions[i].suggestedValue == this.cachedSuggestions[j].suggestedValue)
					{
						alreadyCached = true;
					}
				}
				
				if (!alreadyCached)
				{
					this.cachedSuggestions.push(this.processedSuggestions[i]);
				}
			}
		}
		
		var limitedSuggestions = XXX_SuggestionProviderHelpers.limitToMaximum(this.processedSuggestions, this.maximumClientSide);
		
		if (this.completedCallback)
		{
			this.completedCallback(this.valueAskingSuggestions, limitedSuggestions);
		}
	}
};
