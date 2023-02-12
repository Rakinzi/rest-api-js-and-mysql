import React, { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import 'regenerator-runtime/runtime'
import Frame, { useFrame } from 'react-frame-component'
import fetchData from './HelperComponents/fetchData'
import { initColorState, ItemTypes, popupInitialState } from './Data'
import './scss/survey.scss'
const { applyFilters } = wp.hooks;

let currentIframe = null;
data = {
	...data,
	...surveyData
}

function validateEmail(email) {
    const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase())
}

function convertToRgbaCSS(color) {
    let colorString = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
    return colorString
}

const currentlyPreviewing = false

let initialState = []

let id = 'surveyfunnel-lite-survey-' + data.userLocalID
let metaTitle = '';
let metaDescription = '';
let companyBranding = true;
let shareSettings = {
    popup: { ...popupInitialState }
};

var available;
var percentage_of_page;
var half_screen;
var contentHeight;
let configure = '';

let dismissEvent = new CustomEvent('surveyfunnel-lite-remove-event', { detail: {id}, } );

if ( data.configure !== '' ) {
    configure = JSON.parse(data.configure);
    metaTitle = configure.metaInfo.title;
    metaDescription = configure.metaInfo.description;
    companyBranding = configure.companyBranding;
}

const initialContent =
    `<!DOCTYPE html><html><head><link rel="stylesheet" href="${data.styleSurveyLink}" /><style>*{margin:0; padding:0;box-sizing:border-box;}html{height: 100%}body{height: 100%}</style>
        <meta name="title" content="${metaTitle}" />
        <meta name="description" content="${metaDescription}" />
    </head><body><div class="frame-root"></div></body></html>`;

function ShowErrors({error}) {
	return (
		<>
			{error.length > 0 && (
				<div className="tab-validation-error">
					{error.map(function (err) {
						return err;
					})}
				</div>
			)}
		</>
	);
}
	

function Survey() {
    if (data.build === '') {
        return <p>No Preview Available</p>
    }
    let build = JSON.parse(data.build)
    
    const iframeRef = React.createRef()
    const [height, setHeight] = useState(650);
    const [ showSurvey, setShowSurvey ] = useState( true );
    
    let designCon = {}
    if (data.design === '') {
        designCon = { ...initColorState }
    } else {
        designCon = JSON.parse(data.design)
    }

    if ( data.share !== '' ) {
        shareSettings = JSON.parse( data.share );
    }

    const handleResize = useCallback(
        (iframe) => {
			currentIframe = iframe;
            const height =
                iframe.current?.node.contentDocument?.body?.scrollHeight ?? 0
            if (height !== 0) {
                setHeight(height)
            }

            iframe.current?.node.contentDocument?.body?.style.setProperty(
                "--answer-highlight-box-color",
                convertToRgbaCSS(designCon.answersHighlightBoxColor),
                'important'
		    );
        },
        [iframeRef]
    )

    useEffect(() => handleResize(iframeRef), [handleResize, iframeRef])

    designCon.selectedImageUrl = data.designImageUrl
    const { List } = build
    const [currentTab, setCurrentTab] = useState(0)
    const [tabCount, setTabCount] = useState(0)
    const [componentList, setComponentList] = useState([])
    const [error, setError] = useState([])

    useEffect(() => {
        setComponentList([
            ...List.START_ELEMENTS,
            ...List.CONTENT_ELEMENTS,
            ...List.RESULT_ELEMENTS,
        ])
        setTabCount(
            List.START_ELEMENTS.length +
                List.CONTENT_ELEMENTS.length +
                List.RESULT_ELEMENTS.length
        )
        initialState = [
            ...List.START_ELEMENTS,
            ...List.CONTENT_ELEMENTS,
            ...List.RESULT_ELEMENTS,
        ]
    }, [])

    const addFontFamilyLink = () => {
        if (designCon.fontFamilyValue === '') {
            return ''
        }
        let href =
            'https://fonts.googleapis.com/css2?family=' +
            designCon.fontFamilyValue
        return <link href={href} rel="stylesheet"></link>
    }

    const changeCurrentTab = function (num) {
        // check for validations
        if ( ! checkValidations(num) || currentTab + num >= tabCount ) {
            return;
        }
        if (!currentlyPreviewing && num !== -1) {
            let formData = {
                security: data.ajaxSecurity,
                post_id: data.post_id,
                action: 'surveyfunnel_lite_new_survey_lead',
                userLocalID: data.userLocalID,
                time: data.time,
                completed: List.CONTENT_ELEMENTS.length,
            }

            let resultData = getResultOfCurrentTab()
            if (
                (typeof resultData === 'object' ||
                    typeof resultData === 'function') &&
                resultData !== false
            ) {
                formData.data = JSON.stringify(resultData)
                fetchData(data.ajaxURL, formData).then((data) => {
                    setCurrentTab(currentTab + num)
                })
            } else {
                setCurrentTab(currentTab + num)
            }
            return
        }

        setCurrentTab(currentTab + num)
    }

    const getResultOfCurrentTab = () => {
        let resultData = {
            question: '',
            answer: '',
            _id: '',
            status: 'answered',
            tabNumber: currentTab,
            componentName: componentList[currentTab].componentName,
        }
        if (componentList[currentTab].type !== ItemTypes.CONTENT_ELEMENTS) {
            return false
        }

        resultData._id = componentList[currentTab].id
        switch (componentList[currentTab].componentName) {
            case 'SingleChoice':
                resultData.question = componentList[currentTab].title
                resultData.answer = componentList[currentTab].value
                break
            case 'MultiChoice':
                resultData.question = componentList[currentTab].title
                resultData.answer = componentList[currentTab].answers.filter(
                    function (item) {
                        return item.checked ? item.name : false
                    }
                )
                break
            case 'FormElements':
                resultData.question = componentList[currentTab].title
                resultData.answer = []
                const { List } = componentList[currentTab]
                for (let i = 0; i < List.length; i++) {
                    resultData.answer.push({
                        name: List[i].name,
                        value: List[i].value,
                    })
                }
                break
        }
        return resultData
    }

    const sendAjaxCurrentTabViewed = () => {
        if (
            componentList[currentTab] === undefined ||
            componentList[currentTab].viewed
        ) {
            return
        }
        if (
            !currentlyPreviewing &&
            componentList[currentTab].type === ItemTypes.CONTENT_ELEMENTS
        ) {
            let formData = {
                security: data.ajaxSecurity,
                post_id: data.post_id,
                action: 'surveyfunnel_lite_new_survey_lead',
                userLocalID: data.userLocalID,
                time: data.time,
                data: JSON.stringify({
                    status: 'viewed',
                    _id: componentList[currentTab].id,
                    tabNumber: currentTab,
                    question: componentList[currentTab].title,
                    componentName: componentList[currentTab].componentName,
                }),
            }

            fetchData(data.ajaxURL, formData).then((data) => {})
            setCurrentComponentViewed()
        }
    }

    const setCurrentComponentViewed = () => {
        let newList = JSON.parse(JSON.stringify(componentList))
        newList[currentTab].viewed = true
        setComponentList(newList)
    }
    sendAjaxCurrentTabViewed()

    const checkValidations = (num, disablity = false) => {
        if (currentlyPreviewing) {
            return true
        }

        if (num === -1) {
            setError([])
            return true
        }

        let error = []
        switch (componentList[currentTab].componentName) {
            case 'CoverPage':
				applyFilters('checkCoverPageButtonValidations', flag, componentList[currentTab], iframeRef, error, configure)
				break;
            case 'ResultScreen':
                break
            case 'FormElements':
                let List = componentList[currentTab].List
                List.map(function (item, i) {
                    switch (item.componentName) {
                        case 'FirstName':
                        case 'LastName':
                        case 'ShortTextAnswer':
                        case 'LongTextAnswer':
                            if (item.required) {
                                // do validation.
                                if (item.value === '') {
                                    error.push(
                                        <p key={error.length}>
                                            {item.name} cannot be empty
                                        </p>
                                    )
                                }
                            }
                            break
                        case 'Email':
                            if (item.required) {
                                if (item.value === '') {
                                    error.push(
                                        <p key={error.length}>
                                            {item.name} cannot be empty
                                        </p>
                                    )
                                } else if (!validateEmail(item.value)) {
                                    error.push(
                                        <p key={error.length}>
                                            Not a valid email!
                                        </p>
                                    )
                                }
                            }
                            break
                    }
                })
                break
            case 'MultiChoice':
                const { answers } = componentList[currentTab]
                let flag = false
                for (let i = 0; i < answers.length; i++) {
                    if (answers[i].checked) {
                        flag = true
                        break
                    }
                }
                if (!flag) {
                    error.push(
                        <p key={error.length}>
                            Please select atleast one answer!
                        </p>
                    )
                }
                break
            case 'SingleChoice':
                if (componentList[currentTab].value === '') {
                    error.push(
                        <p key={error.length}>
                            Please select atleast one answer!
                        </p>
                    )
                }
                break
        }
        if (error.length > 0) {
            if ( ! disablity ) {
                setError(error);
            }
            return false
        }
        if ( ! disablity ) {
            setError([]);
        }
        return true
    }

    const renderContentElements = (item, display = 'none', idx) => {
        let style = {
            display,
        }
        switch (item.componentName) {
            case 'SingleChoice':
                return (
                    <div
                        className="surveyfunnel-lite-tab-SingleChoice"
                        style={{ ...style }}
                        key={item.id}
                    >
                        <div className="tab-container" key={item.id}>
                            <div
                                className="tab"
                                key={item.id}
                                tab-componentname={item.componentName}
                            >
                                <h3 className="surveyTitle">{item.title}</h3>
                                <p className="surveyDescription">
                                    {item.description}
                                </p>

                                <div className="radio-group">
                                    {item.answers.map(function (ele, i) {
                                        return (
                                            <div
                                                key={
                                                    item.id + '_radio' + '_' + i
                                                }
                                                style={{
                                                    border: `1px solid ${convertToRgbaCSS(
                                                        designCon.answerBorderColor
                                                    )}`,
                                                }}
                                                className="surveyfunnel-lite-tab-answer-container"
                                            >
                                                <input
                                                    type="radio"
                                                    name={item.id + '_radio'}
                                                    id={
                                                        item.id +
                                                        '_radio' +
                                                        '_' +
                                                        i
                                                    }
                                                    value={ele.name}
                                                    onChange={handleRadioChange}
                                                    listidx={idx}
                                                    inputidx={i}
                                                    checked={
                                                        item.value === ele.name
                                                    }
                                                />
                                                <label
                                                    htmlFor={
                                                        item.id +
                                                        '_radio' +
                                                        '_' +
                                                        i
                                                    }
                                                >
                                                    <div>{parseInt(i) + 1}</div>
                                                    <p>{ele.name}</p>
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
								<ShowErrors error={error} />
								{checkValidations( 1, true ) && <div className="nextButtonChoices">
									<button type="button" onClick={() => {changeCurrentTab(1);}}>Next</button>	
								</div>}
                            </div>
                        </div>
                    </div>
                )
            case 'MultiChoice':
                return (
                    <div
                        className="surveyfunnel-lite-tab-MultiChoice"
                        style={{ ...style }}
                        key={item.id}
                    >
                        <div className="tab-container" key={item.id}>
                            <div
                                className="tab"
                                key={item.id}
                                tab-componentname={item.componentName}
                            >
                                <h3 className="surveyTitle">{item.title}</h3>
                                <p className="surveyDescription">
                                    {item.description}
                                </p>

                                <div className="checkbox-group">
                                    {item.answers.map(function (ele, i) {
                                        return (
                                            <div
                                                key={
                                                    item.id +
                                                    '_checkbox' +
                                                    '_' +
                                                    i
                                                }
                                                style={{
                                                    border: `1px solid ${convertToRgbaCSS(
                                                        designCon.answerBorderColor
                                                    )}`,
                                                }}
                                                className="surveyfunnel-lite-tab-answer-container"
                                            >
                                                <input
                                                    type="checkbox"
                                                    name={item.id + '_checkbox'}
                                                    id={
                                                        item.id +
                                                        '_checkbox' +
                                                        '_' +
                                                        i
                                                    }
                                                    value={ele.name}
                                                    listidx={idx}
                                                    inputidx={i}
                                                    checked={ele.checked}
                                                    onChange={
                                                        handleCheckboxChange
                                                    }
                                                />
                                                <label
                                                    htmlFor={
                                                        item.id +
                                                        '_checkbox' +
                                                        '_' +
                                                        i
                                                    }
                                                >
                                                    <div>{parseInt(i) + 1}</div>
                                                    <p>{ele.name}</p>
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
								<ShowErrors error={error} />
								{checkValidations( 1, true ) && <div className="nextButtonChoices">
									<button type="button" onClick={() => {changeCurrentTab(1);}}>Next</button>	
								</div>}
                            </div>
                        </div>
                    </div>
                )
            case 'CoverPage':
                return (
                    <div
                        className="surveyfunnel-lite-tab-CoverPage"
                        style={{ ...style }}
                        key={item.id}
                    >
                        <div className="tab-container" key={item.id}>
                            <div
                                className="tab"
                                tab-componentname={item.componentName}
                            >
                                <h3 className="surveyTitle">{item.title}</h3>
                                <p className="surveyDescription">
                                    {item.description}
                                </p>
								
								{applyFilters( 'renderPrivacyPolicyOption', '', configure, item, require( './Components/Build/BuildImages/checkmark.png' ) )}
								<ShowErrors error={error} />
                                <button
                                    type="button"
                                    className="surveyButton"
                                    style={{
                                        background: convertToRgbaCSS(
                                            designCon.buttonColor
                                        ),
                                        color: convertToRgbaCSS(
                                            designCon.buttonTextColor
                                        ),
                                    }}
                                    onClick={() => {
                                        changeCurrentTab(1)
                                    }}
                                >
                                    {item.button}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            case 'ResultScreen':
                return (
                    <div
                        className="surveyfunnel-lite-tab-ResultScreen"
                        style={{ ...style }}
                        key={item.id}
                    >
                        <div className="tab-container" key={item.id}>
                            <div
                                className="tab"
                                tab-componentname={item.componentName}
                            >
                                <h3 className="surveyTitle">{item.title}</h3>
                                <p className="surveyDescription">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            case 'FormElements':
                return (
                    <div
                        className="surveyfunnel-lite-tab-FormElements"
                        style={{ ...style }}
                        key={item.id}
                    >
                        <div className="tab-container" key={item.id}>
                            <div
                                className="tab"
                                tab-componentname={item.componentName}
                            >
                                <h3 className="surveyTitle">{item.title}</h3>
                                <p className="surveyDescription">
                                    {item.description}
                                </p>
                                {item.List.map(function (ele, i) {
                                    switch (ele.componentName) {
                                        case 'FirstName':
                                        case 'LastName':
                                        case 'ShortTextAnswer':
                                            return (
                                                <div
                                                    key={
                                                        ele.id + '_' + i + 'key'
                                                    }
                                                >
                                                    <label>{ele.name}</label>
                                                    <input
                                                        type="text"
                                                        id={ele.id + '_' + i}
                                                        style={{
                                                            border: `1px solid ${convertToRgbaCSS(
                                                                designCon.answerBorderColor
                                                            )}`,
                                                        }}
                                                        placeholder={
                                                            ele.placeholder
                                                        }
                                                        required={ele.required}
                                                        value={ele.value}
                                                        onChange={handleChange}
                                                        inputidx={i}
                                                        listidx={idx}
                                                    />
                                                </div>
                                            )
                                        case 'Email':
                                            return (
                                                <div
                                                    key={
                                                        ele.id + '_' + i + 'key'
                                                    }
                                                >
                                                    <label>{ele.name}</label>
                                                    <input
                                                        type="email"
                                                        id={ele.id + '_' + i}
                                                        style={{
                                                            border: `1px solid ${convertToRgbaCSS(
                                                                designCon.answerBorderColor
                                                            )}`,
                                                        }}
                                                        placeholder={
                                                            ele.placeholder
                                                        }
                                                        required={ele.required}
                                                        value={ele.value}
                                                        onChange={handleChange}
                                                        inputidx={i}
                                                        listidx={idx}
                                                    />
                                                </div>
                                            )
                                        case 'LongTextAnswer':
                                            return (
                                                <div
                                                    key={
                                                        ele.id + '_' + i + 'key'
                                                    }
                                                >
                                                    <label>{ele.name}</label>
                                                    <textarea
                                                        id={ele.id + '_' + i}
                                                        style={{
                                                            border: `1px solid ${convertToRgbaCSS(
                                                                designCon.answerBorderColor
                                                            )}`,
                                                        }}
                                                        required={ele.required}
                                                        placeholder={
                                                            ele.placeholder
                                                        }
                                                        value={ele.value}
                                                        onChange={handleChange}
                                                        inputidx={i}
                                                        listidx={idx}
                                                    ></textarea>
                                                </div>
                                            )
                                    }
                                })}
								<ShowErrors error={error} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        changeCurrentTab(1)
                                    }}
                                >
                                    {item.buttonLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            default:
                return ''
        }
    }

    const handleChange = (e) => {
        let inputidx = e.target.getAttribute('inputidx')
        let listidx = e.target.getAttribute('listidx')
        let newList = JSON.parse(JSON.stringify(componentList))
        newList[listidx].List[inputidx].value = e.target.value
        setComponentList(newList)
    }

    const handleCheckboxChange = (e) => {
        let inputidx = e.target.getAttribute('inputidx')
        let listidx = e.target.getAttribute('listidx')
        let newList = JSON.parse(JSON.stringify(componentList))
        newList[listidx].answers[inputidx].checked =
            !newList[listidx].answers[inputidx].checked
        setComponentList(newList)
    }

    const handleRadioChange = (e) => {
        let listidx = e.target.getAttribute('listidx')
        let newList = JSON.parse(JSON.stringify(componentList))
        newList[listidx].value = e.target.value
        setComponentList(newList)
    }

    let backgroundStyle = {
    }

    if (designCon.selectedImageUrl !== null) {
        backgroundStyle.background = `linear-gradient(rgba(255,255,255,${designCon.opacity}), rgba(255,255,255,${designCon.opacity})), url('${designCon.selectedImageUrl}') 50%/cover`;
    } else {
        backgroundStyle.background = convertToRgbaCSS(designCon.backgroundColor)
    }

    const checkButtonDisability = ( buttonType ) => {
        switch( buttonType ) {
            case 'Previous':
                return currentTab === 0;

            case 'Next':
                return currentTab === tabCount - 1 || componentList[currentTab].componentName === 'FormElements' || ! checkValidations( 1, true );
        }
    }

    const checkButtonVisibility = ( buttonType ) => {
        switch( buttonType ) {
            case 'Previous':
                return (currentTab !== 0 && (componentList[currentTab].type !== 'RESULT_ELEMENTS' || componentList[currentTab].type !== 'START_ELEMENTS'))
            case 'Next':
                return (currentTab !== tabCount - 1 && (componentList[currentTab].type !== 'RESULT_ELEMENTS' || componentList[currentTab].type !== 'START_ELEMENTS'));
        }
    }

    const dismissSurvey = () => {
		let wpsfSurveyCookie = getCookie( 'surveyfunnel-lite-dismiss' );

		if ( data.type === 'popup' ) {
			// frequency is always show?
			if ( shareSettings.popup.behaviourOptions.frequencyOptions.frequency === 'alwaysShow' ) {
				window.parent.dispatchEvent(dismissEvent);
				showOrHideSurvey(false);
				return;
			}
			let cookieName = data.post_id + ',';
			if ( wpsfSurveyCookie && shareSettings.popup.behaviourOptions.frequencyOptions.frequency === 'hideFor' ) {
				cookieName = wpsfSurveyCookie + cookieName;
			}
			setCookie('surveyfunnel-lite-dismiss', cookieName, shareSettings.popup.behaviourOptions.frequencyOptions.hideFor );
		}
        else {
			setCookie('surveyfunnel-lite-dismiss', data.post_id + ',', 1 );
		}
		window.parent.dispatchEvent(dismissEvent);
        showOrHideSurvey(false);
    }

    const restartOrCompleteSurvey = ( status ) => {
        switch ( status ) {
            case 'Restart':
                setCurrentTab(0);
                return;
            case 'Complete':
                let wpsfSurveyCookie = getCookie( 'surveyfunnel-lite-completed' );
                if ( wpsfSurveyCookie ) {
                    let pattern = new RegExp(data.post_id , "g");
                    if ( pattern.test( wpsfSurveyCookie ) ) {
                        return;
                    }
                    if ( data.type === 'popup' ) {
                        setCookie('surveyfunnel-lite-completed', wpsfSurveyCookie + ',' + data.post_id , 28625 );
                    }
                    else
                        setCookie('surveyfunnel-lite-completed', wpsfSurveyCookie + ',' + data.post_id , 1);
                }
                else {
                    if ( data.type === 'popup' ) {
                        setCookie('surveyfunnel-lite-completed', data.post_id , 28625 );
                    }
                    else
                        setCookie('surveyfunnel-lite-completed', data.post_id , 1);
                }
				window.parent.dispatchEvent(dismissEvent);
                showOrHideSurvey(false);
                return;
            default:
                return;
        }
    }

    const showOrHideSurvey = ( status ) => {
        if ( ! status ) {
            setShowSurvey(false);
			return;
        }
        let wpsfSurveyDismissed = getCookie('surveyfunnel-lite-dismissed');
        let wpsfSurveyCompleted = getCookie('surveyfunnel-lite-completed');
        let postIdRegEx = new RegExp( data.post_id, 'i' );
        if ( postIdRegEx.test( wpsfSurveyDismissed ) || postIdRegEx.test(wpsfSurveyCompleted) ) {
            return;
        }
        setShowSurvey(true);
    }

    return (
        showSurvey && <Frame
            ref={iframeRef}
            initialContent={initialContent}
            width={data.type === 'custom' ? data.width : "100%"}
            height={data.type === 'custom' ? data.height : "100%"}
            id={id + '_iframe'}
            style={{
                border: '0',
				margin: 'auto',
                height: data.type === 'responsive' ? height : '',
            }}
            className={'surveyfunnel-lite-sc-'+data.type}
            onLoad={() => handleResize(iframeRef)}
            scrolling="no"
        >
            <div id="design">
                <div className="surveyfunnel-lite-design-container">
                    <div className="design-preview" style={{fontFamily: designCon.fontFamily, ...backgroundStyle}}>
                        {addFontFamilyLink()}
                        <div className="surveyfunnel-lite-survey-form">
                            {tabCount === 0 ? (
                                <div className="no-preview-available">
                                    <img src={require(`./Components/Build/BuildImages/unavailable.png`)}></img>
                                    {currentlyPreviewing
                                        ? "No Preview Available"
                                        : "No Questions were added in this survey"}
                                </div>
                            ) : (
                                <div className="surveyfunnel-lite-design-preview-container" style={{  }}>
									{(data.type === 'fullpage' || data.type === 'popup') && <div className="dismissalBox">
										<button onClick={dismissSurvey}>X</button>
									</div>}
                                    <div className="preview" style={{color: convertToRgbaCSS( designCon.fontColor ) }}>
										<div className="preview-container">
                                        <div className="tab-list" style={{background: convertToRgbaCSS( designCon.backgroundContainerColor )}}>
                                            {componentList.map(function (item, i) {
                                                if (currentTab === i) {
                                                    switch(item.componentName){
                                                        case 'CoverPage':
                                                        case 'ResultScreen':
                                                            return renderContentElements(item, "flex", i);
                                                        case 'SingleChoice':
                                                        case 'MultiChoice':
                                                        case 'FormElements':
                                                            return renderContentElements(item, "block", i);

                                                    }
                                                }
                                                return renderContentElements(item, 'none', i);
                                            })}
                                        </div>    
										</div>
                                    </div>
                                    <div className="tab-controls">
                                            <span className="tab-controls-inner">
                                            {companyBranding && <div><a target="_blank" href="https://www.dicomm.co.zw"><span style={{fontSize: '10px'}}>Powererd By</span><img src={require('../images/surveyfunnel-lite-main-logo.png')} alt="dicomm-mccann" /></a></div> }
                                            
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    changeCurrentTab(-1);
                                                }}
                                                disabled={checkButtonDisability('Previous')}
                                            >
                                                &lt;
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    changeCurrentTab(1);
                                                }}
                                                disabled={checkButtonDisability('Next')}
                                            >
                                                &gt;
                                            </button>
                                            { componentList[currentTab].type === 'RESULT_ELEMENTS'  && <div><button onClick={() => {
                                                let survey = currentTab === tabCount - 1 ? "Complete" : "Restart";
                                                restartOrCompleteSurvey(survey);
                                            }}>
                                                {currentTab === tabCount - 1 ? "Complete Survey" : "Restart"}    
                                            </button></div>}
                                            </span>
                                        </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Frame>
    )
}

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

ReactDOM.render(<Survey />, document.getElementById(id))
