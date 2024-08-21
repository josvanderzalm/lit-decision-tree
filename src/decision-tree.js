import { LitElement, html, css } from 'lit';

class DecisionTree extends LitElement {
  static properties = {
    config: { type: Object },
    currentNode: { type: String },
    answerPath: { type: Array },
  };

  constructor() {
    super();
    this.config = {};
    this.currentNode = 'root';
    this.answerPath = [];
  }

  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      padding: 16px;
      background-color: #f9f9f9;
      border: 1px solid #ccc;
      border-radius: 8px;
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
    }
    h2 {
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    button {
      display: block;
      margin: 8px 0;
      padding: 8px 16px;
      font-size: 16px;
    }
    button:not([disabled]) {
      cursor: pointer;
    }
    p {
      font-size: 18px;
    }
    .conclusions {
      max-width: 300px;
      margin-left: 20px;
    }
    .conclusions h3 {
      font-size: 20px;
      margin-bottom: 10px;
    }
    .conclusions ul {
      list-style-type: none;
      padding-left: 0;
    }
    .conclusions li {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .conclusions li.strike {
      text-decoration: line-through;
      color: #888;
    }
  `;

  render() {
    return html`
      <div>${this.renderPath()} ${this.renderCurrentNode()}</div>
      <div class="conclusions">${this.renderConclusions()}</div>
    `;
  }

  renderPath() {
    return html`${this.answerPath.map((step, index) => this.renderStep(step, index))}`;
  }

  renderStep(step, index) {
    return html`
      <div>
        <h2>${step.question}</h2>
        ${step.answers.map(
          (answer, i) => html`
            <button
              @click="${() => this.resetToStep(index, i)}"
              ?disabled="${step.selected === answer}"
            >
              ${answer}
            </button>
          `
        )}
      </div>
    `;
  }

  renderCurrentNode() {
    const node = this.config[this.currentNode];
    if (!node) return this.renderInvalidConfig();

    if (node.question) return this.renderNodeQuestion(node);
    if (node.conclusion) return this.renderNodeConclusion(node);

    return this.renderInvalidConfig();
  }

  renderNodeQuestion(node) {
    return html`
      <div>
        <h2>${node.question}</h2>
        ${node.answers.map(
          (answer) => html`
            <button @click="${() => this.handleAnswerClick(answer)}">
              ${answer.label}
            </button>
          `
        )}
      </div>
    `;
  }

  renderNodeConclusion(node) {
    return html`<p><strong><em>${node.conclusion}</em></strong></p>`;
  }

  renderInvalidConfig() {
    return html`<p>Invalid node configuration.</p>`;
  }

  handleAnswerClick(answer) {
    const currentNodeConfig = this.config[this.currentNode];
    if (!currentNodeConfig) {
      console.error(`Node configuration missing for node: ${this.currentNode}`);
      return;
    }

    this.updateAnswerPath(answer, currentNodeConfig);
    const nextNode = this.determineNextNode(answer, currentNodeConfig);

    if (nextNode) {
      this.currentNode = nextNode;
    } else {
      console.error(
        `Invalid next node for answer "${answer.label}" in node "${this.currentNode}"`
      );
    }

    this.requestUpdate();
  }

  updateAnswerPath(answer, currentNodeConfig) {
    this.answerPath.push({
      node: this.currentNode,
      key: answer.key,
      answers: currentNodeConfig.answers.map((a) => a.label),
      selected: answer.label,
      question: currentNodeConfig.question,
    });
  }

  determineNextNode(answer, currentNodeConfig) {
    let nextNode = answer.next;

    if (Array.isArray(nextNode)) {
      nextNode = this.getNextNodeFromPath(nextNode);
    }

    return nextNode;
  }

  resetToStep(index, answerIndex) {
    if (index >= 0 && index < this.answerPath.length) {
      const currentNodeConfig = this.config[this.answerPath[index].node];

      if (
        currentNodeConfig &&
        answerIndex >= 0 &&
        answerIndex < currentNodeConfig.answers.length
      ) {
        this.currentNode = this.answerPath[index].node;
        this.answerPath = this.answerPath.slice(0, index);
        this.handleAnswerClick(currentNodeConfig.answers[answerIndex]);
      } else {
        console.error("Invalid answer index or node configuration.");
      }
    } else {
      console.error("Invalid index for resetToStep.");
    }
  }

  getNextNodeFromPath(nextArray) {
    const targetPath = this.answerPath.map((step) =>
      step.key ? `${step.node}.${step.key}` : step.node
    );

    return nextArray.find((element) =>
      this.isMatchingPath(element.path, targetPath)
    )?.next || null;
  }

  isMatchingPath(elementPath, targetPath) {
    return elementPath.every((value, index) => value === targetPath[index]);
  }

  renderConclusions() {
    const allConclusions = this.getAllConclusions(this.config);
    const possibleConclusions = this.getPossibleConclusions();

    return html`
      <h3>Possible Conclusions</h3>
      <ul>
        ${allConclusions.map(
          (conclusion) => html`
            <li
              class="${possibleConclusions.includes(conclusion)
                ? ""
                : "strike"}"
            >
              ${conclusion}
            </li>
          `
        )}
      </ul>
    `;
  }

  getAllConclusions(config) {
    const conclusions = [];
    this.collectConclusions(config.root, conclusions);
    return conclusions;
  }

  collectConclusions(node, conclusions) {
    if (node.conclusion) {
      conclusions.push(node.conclusion);
    }
    node.answers?.forEach((answer) => {
      if (typeof answer.next === 'string') {
        this.collectConclusions(this.config[answer.next], conclusions);
      } else if (Array.isArray(answer.next)) {
        answer.next.forEach((nextNode) =>
          this.collectConclusions(this.config[nextNode.next], conclusions)
        );
      }
    });
  }

  getPossibleConclusions() {
    const possibleConclusions = [];
    let currentNode = this.config.root;

    this.answerPath.forEach((step) => {
      currentNode = this.getNextNodeForStep(currentNode, step.selected);
    });

    this.collectConclusions(currentNode, possibleConclusions);
    return possibleConclusions;
  }

  getNextNodeForStep(currentNode, selectedAnswer) {
    const nextNodeKey = currentNode.answers.find(
      (a) => a.label === selectedAnswer
    )?.next;

    if (typeof nextNodeKey === 'string') {
      return this.config[nextNodeKey];
    } else if (Array.isArray(nextNodeKey)) {
      return this.getNextNodeFromPath(nextNodeKey);
    }

    return null;
  }
}

customElements.define('decision-tree', DecisionTree);
